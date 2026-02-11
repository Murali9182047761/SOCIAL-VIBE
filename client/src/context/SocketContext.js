import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import { SERVER_URL } from '../config';
import { ChatState } from './ChatProvider';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { user } = ChatState();
    const [socket, setSocket] = useState(null);
    const [stream, setStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [call, setCall] = useState({});
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [name, setName] = useState('');
    const [callType, setCallType] = useState('video'); // 'video' or 'voice'
    const [otherUserId, setOtherUserId] = useState(null);
    const [callStatus, setCallStatus] = useState(''); // 'Calling...', 'Ringing...', etc.

    // Track states
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();
    const streamRef = useRef();

    useEffect(() => {
        streamRef.current = stream;
    }, [stream]);

    // Group Call States
    const [isGroupCall, setIsGroupCall] = useState(false);
    const [groupCall, setGroupCall] = useState(null); // { chatId, groupName, callerName, type }
    const [groupPeers, setGroupPeers] = useState([]); // Array of { peerID, peer, userName, stream }
    const peersRef = useRef([]); // To keep track of peers without re-renders

    const handleCallTermination = useCallback(() => {
        console.log("☎️ Call Termination cleaning up...");
        setCallEnded(true);

        // Cleanup single call
        if (connectionRef.current) {
            try {
                connectionRef.current.destroy();
                connectionRef.current = null;
            } catch (e) { }
        }

        // Cleanup group call
        peersRef.current.forEach(p => {
            try {
                p.peer.destroy();
            } catch (e) { }
        });
        peersRef.current = [];
        setGroupPeers([]);
        setIsGroupCall(false);
        setGroupCall(null);

        setCall({});
        setCallAccepted(false);
        setRemoteStream(null);
        setIsScreenSharing(false);
        setIsVideoMuted(false);
        setIsAudioMuted(false);
        setCallStatus('');

        const currentStream = streamRef.current;
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) { }
            });
        }
        setStream(null);
        setOtherUserId(null);
    }, []);

    // Stable User ID for dependencies
    const userId = user?._id;

    // Group Call Signaling Helpers
    const createPeer = useCallback((userToSignal, callerID, stream, socket) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        peer.on("signal", signal => {
            socket.emit("sending-signal", { userToSignal, callerID, signal, userName: user?.name });
        });

        peer.on("stream", (remoteStream) => {
            console.log("🎥 Received remote stream from peer:", userToSignal);
            setGroupPeers(prev => prev.map(p => p.peerID === userToSignal ? { ...p, stream: remoteStream } : p));
        });

        return peer;
    }, [user?.name]);

    const addPeer = useCallback((incomingSignal, callerID, stream, socket) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        peer.on("signal", signal => {
            // callerID is the person who initiated, so we return signal to them
            socket.emit("returning-signal", { signal, callerID, userName: user?.name });
        });

        peer.on("stream", (remoteStream) => {
            console.log("🎥 Receiver side: Received remote stream from peer:", callerID);
            setGroupPeers(prev => prev.map(p => p.peerID === callerID ? { ...p, stream: remoteStream } : p));
        });

        peer.signal(incomingSignal);

        return peer;
    }, [user?.name]);

    useEffect(() => {
        if (!userId) return;

        console.log("🔌 Attempting Socket Connection for:", user?.name);
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);
        setName(user?.name);

        newSocket.on("connect", () => {
            console.log("✅ Socket Connected, ID:", newSocket.id);
            newSocket.emit("setup", user);
        });

        newSocket.on('callUser', ({ from, name: callerName, signal, type }) => {
            console.log("📨 INCOMING CALL EVENT", { from, callerName, type });
            setCall({ isReceivingCall: true, from, name: callerName, signal, type });
            setCallType(type);
            setOtherUserId(from);
            newSocket.emit('ringing', { to: from });
        });

        // Group Call Listeners
        newSocket.on("all users in call", (users) => {
            console.log("👥 Batch connecting to existing users:", users);
            const peers = [];
            users.forEach(userID => {
                const peer = createPeer(userID, newSocket.id, streamRef.current, newSocket);
                peersRef.current.push({
                    peerID: userID,
                    peer,
                });
                peers.push({
                    peerID: userID,
                    peer,
                });
            });
            setGroupPeers(peers);
        });

        newSocket.on("user joined call", (payload) => {
            console.log("👤 New user joined group call:", payload.callerID, payload.userName);
            const peer = addPeer(payload.signal, payload.callerID, streamRef.current, newSocket);
            peersRef.current.push({
                peerID: payload.callerID,
                peer,
            });

            setGroupPeers(users => [...users, { peerID: payload.callerID, peer, userName: payload.userName }]);
        });

        newSocket.on("receiving returned signal", (payload) => {
            console.log("📥 Received returned signal from:", payload.id, payload.userName);
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) {
                item.peer.signal(payload.signal);
            }
            setGroupPeers(users => users.map(u => u.peerID === payload.id ? { ...u, userName: payload.userName } : u));
        });

        newSocket.on("user left call", (id) => {
            const peerObj = peersRef.current.find(p => p.peerID === id);
            if (peerObj) {
                peerObj.peer.destroy();
            }
            const peers = peersRef.current.filter(p => p.peerID !== id);
            peersRef.current = peers;
            setGroupPeers(peers);
        });

        newSocket.on('ringing', () => {
            console.log("🔔 Call is ringing on remote side");
            setCallStatus('Ringing...');
        });

        newSocket.on("incoming group call notification", (data) => {
            console.log("📢 INCOMING GROUP CALL:", data);
            setGroupCall(data);
        });

        newSocket.on('callEnded', () => {
            console.log("📉 CALL ENDED BY REMOTE");
            handleCallTermination();
        });

        return () => {
            if (newSocket) {
                console.log("🔌 Disconnecting Socket and cleaning up peers");
                newSocket.disconnect();
                setSocket(null);

                // Cleanup peers on socket disconnect to prevent stale connections
                peersRef.current.forEach(p => {
                    try { p.peer.destroy(); } catch (e) { }
                });
                peersRef.current = [];
                setGroupPeers([]);
            }
        };
    }, [userId, user, handleCallTermination, addPeer, createPeer]);



    const joinGroupCall = useCallback(async (selectedChat, type) => {
        if (!socket) return;
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true
            });
            setStream(mediaStream);
            streamRef.current = mediaStream; // Ensure ref is updated immediately
            setIsGroupCall(true);
            setGroupCall(null); // Clear incoming notification if any
            setCallType(type);
            setCallAccepted(true);
            setCallEnded(false);

            // Notify others
            if (selectedChat.users && selectedChat.users.length > 0) {
                socket.emit("start group call", {
                    chatId: selectedChat._id,
                    groupName: selectedChat.chatName,
                    callerName: user?.name,
                    callerId: user?._id,
                    type,
                    users: selectedChat.users
                });
            }

            socket.emit("joining group call", selectedChat._id);
        } catch (err) {
            console.error("Group call error:", err);
            alert("Could not access camera/microphone");
        }
    }, [socket, user?.name, user?._id]);

    const leaveGroupCall = useCallback((chatId) => {
        if (socket && chatId) {
            socket.emit("leaving group call", chatId);
        }
        handleCallTermination();
    }, [socket, handleCallTermination]);

    const answerCall = useCallback((currentStream) => {
        console.log("📞 Answering Call...");
        setCallAccepted(true);
        setCallEnded(false);
        const activeStream = currentStream || streamRef.current;

        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: activeStream,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        peer.on('signal', (data) => {
            console.log("📡 SIGNAL: Generated answer signal, sending to", call.from);
            socket.emit('answerCall', { signal: data, to: call.from });
        });

        peer.on('stream', (incomingStream) => {
            console.log("🎥 STREAM: Received remote stream on RECIPIENT side");
            setRemoteStream(incomingStream);
        });

        peer.on('error', (err) => {
            console.error("❌ PEER ERROR (Recipient):", err);
        });

        peer.signal(call.signal);
        connectionRef.current = peer;
    }, [call.from, call.signal, socket]);

    const callUser = useCallback((id, recipientName, type, currentStream) => {
        console.log("📞 Initiating Call to:", id, "Type:", type);
        setCall({ isCalling: true, name: recipientName, type });
        setCallStatus('Calling...');
        setCallType(type);
        setCallAccepted(false);
        setCallEnded(false);
        setOtherUserId(id);
        const activeStream = currentStream || streamRef.current;

        if (!activeStream) {
            console.error("❌ ERROR: No stream available to initiate call");
            return;
        }

        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: activeStream,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        peer.on('signal', (data) => {
            console.log("📡 SIGNAL: Generated offer signal, sending to server for", id);
            socket.emit('callUser', {
                userToCall: id,
                signalData: data,
                from: userId,
                name: name,
                type
            });
        });

        peer.on('stream', (incomingStream) => {
            console.log("🎥 STREAM: Received remote stream on CALLER side");
            setRemoteStream(incomingStream);
        });

        peer.on('error', (err) => {
            console.error("❌ PEER ERROR (Caller):", err);
        });

        socket.once('callAccepted', (signal) => {
            console.log("✅ Handshake: Call accepted by remote");
            setCallAccepted(true);
            setCallStatus('Connected');
            peer.signal(signal);
        });

        connectionRef.current = peer;
    }, [socket, userId, name]);

    const leaveCall = useCallback((toId) => {
        const targetId = toId || otherUserId;
        console.log("🚪 Leaving call, target:", targetId);
        if (socket && targetId) {
            socket.emit("endCall", { to: targetId });
        }
        handleCallTermination();
    }, [socket, otherUserId, handleCallTermination]);

    // Feature Toggles
    const toggleVideo = useCallback(() => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoMuted(!videoTrack.enabled);
            }
        }
    }, [stream]);

    const toggleAudio = useCallback(() => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioMuted(!audioTrack.enabled);
            }
        }
    }, [stream]);

    const toggleScreenShare = useCallback(async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
                const screenTrack = screenStream.getTracks()[0];

                // Single call track replacement
                if (connectionRef.current) {
                    const videoTrack = stream.getVideoTracks()[0];
                    connectionRef.current.replaceTrack(videoTrack, screenTrack, stream);
                }

                // Group call track replacement
                peersRef.current.forEach(p => {
                    const videoTrack = stream.getVideoTracks()[0];
                    p.peer.replaceTrack(videoTrack, screenTrack, stream);
                });

                myVideo.current.srcObject = screenStream;
                setIsScreenSharing(true);

                screenTrack.onended = () => {
                    const videoTrack = stream.getVideoTracks()[0];
                    if (connectionRef.current) {
                        connectionRef.current.replaceTrack(screenTrack, videoTrack, stream);
                    }
                    peersRef.current.forEach(p => {
                        p.peer.replaceTrack(screenTrack, videoTrack, stream);
                    });
                    myVideo.current.srcObject = stream;
                    setIsScreenSharing(false);
                    screenStream.getTracks().forEach(track => track.stop());
                };
            } catch (error) {
                console.error("Error sharing screen:", error);
            }
        } else {
            // Stop sharing logic (same as onended)
            const screenStream = myVideo.current.srcObject;
            const screenTrack = screenStream.getTracks()[0];
            const videoTrack = stream.getVideoTracks()[0];

            if (connectionRef.current) {
                connectionRef.current.replaceTrack(screenTrack, videoTrack, stream);
            }
            peersRef.current.forEach(p => {
                p.peer.replaceTrack(screenTrack, videoTrack, stream);
            });
            myVideo.current.srcObject = stream;
            setIsScreenSharing(false);
            screenStream.getTracks().forEach(track => track.stop());
        }
    }, [isScreenSharing, stream]);

    return (
        <SocketContext.Provider value={{
            call,
            callAccepted,
            myVideo,
            userVideo,
            stream,
            remoteStream,
            name,
            setName,
            callEnded,
            callUser,
            leaveCall,
            answerCall,
            setStream,
            socket,
            callType,
            otherUserId,
            // New features
            isVideoMuted,
            isAudioMuted,
            isScreenSharing,
            toggleVideo,
            toggleAudio,
            toggleScreenShare,
            callStatus,
            // Group Call exports
            isGroupCall,
            groupCall,
            setGroupCall,
            groupPeers,
            setGroupPeers,
            joinGroupCall,
            leaveGroupCall
        }}>
            {children}
        </SocketContext.Provider>
    );
};

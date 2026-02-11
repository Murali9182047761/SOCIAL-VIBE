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

    useEffect(() => {
        if (!userId) return;

        // Signaling Helper inside stable effect to avoid closures issues
        const createPeer = (userToSignal, callerID, stream, socket) => {
            console.log("🛠️ Creating initiator peer for:", userToSignal);
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
                console.log("🎥 Received remote stream from peer (Initiator):", userToSignal);
                setGroupPeers(prev => prev.map(p => p.peerID === userToSignal ? { ...p, stream: remoteStream } : p));
            });

            peer.on("error", (err) => console.error("❌ PEER ERROR (Group Initiator):", err));

            return peer;
        };

        const addPeer = (incomingSignal, callerID, stream, socket) => {
            console.log("🛠️ Creating receiver peer for:", callerID);
            const peer = new Peer({
                initiator: false,
                trickle: false,
                stream,
                config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
            });

            peer.on("signal", signal => {
                socket.emit("returning-signal", { signal, callerID, userName: user?.name });
            });

            peer.on("stream", (remoteStream) => {
                console.log("🎥 Received remote stream from peer (Receiver):", callerID);
                setGroupPeers(prev => prev.map(p => p.peerID === callerID ? { ...p, stream: remoteStream } : p));
            });

            peer.on("error", (err) => console.error("❌ PEER ERROR (Group Receiver):", err));

            peer.signal(incomingSignal);
            return peer;
        };

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
                const peerObj = {
                    peerID: userID,
                    peer,
                    userName: 'Participant',
                    stream: null
                };
                peersRef.current.push(peerObj);
                peers.push(peerObj);
            });
            setGroupPeers(peers);
        });

        newSocket.on("user joined call", (payload) => {
            console.log("👤 New user joined group call:", payload.callerID, payload.userName);
            const peer = addPeer(payload.signal, payload.callerID, streamRef.current, newSocket);
            const peerObj = {
                peerID: payload.callerID,
                peer,
                userName: payload.userName,
                stream: null
            };
            peersRef.current.push(peerObj);
            setGroupPeers(prev => [...prev, peerObj]);
        });

        newSocket.on("receiving returned signal", (payload) => {
            console.log("📥 Received returned signal from:", payload.id, payload.userName);
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) {
                item.peer.signal(payload.signal);
            }
            setGroupPeers(prev => prev.map(u => u.peerID === payload.id ? { ...u, userName: payload.userName } : u));
        });

        newSocket.on("user left call", (id) => {
            console.log("🚪 User left group call:", id);
            const peerObj = peersRef.current.find(p => p.peerID === id);
            if (peerObj && peerObj.peer) {
                try { peerObj.peer.destroy(); } catch (e) { }
            }
            peersRef.current = peersRef.current.filter(p => p.peerID !== id);
            setGroupPeers(prev => prev.filter(p => p.peerID !== id));
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
                console.log("🔌 Disconnecting Socket and cleaning up peers stage 1");
                newSocket.disconnect();
                setSocket(null);
            }
        };
    }, [userId, user?.name, handleCallTermination]);

    // Final cleanup Effect
    useEffect(() => {
        return () => {
            console.log("🛑 SocketProvider unmounting, final cleanup");
            handleCallTermination();
        };
    }, [handleCallTermination]);



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

    const stopScreenSharing = useCallback((screenStream) => {
        if (!screenStream) return;

        const videoTrack = stream.getVideoTracks()[0];
        const screenTrack = screenStream.getTracks()[0];

        if (connectionRef.current && videoTrack && screenTrack) {
            connectionRef.current.replaceTrack(screenTrack, videoTrack, stream);
        }

        peersRef.current.forEach(p => {
            if (videoTrack && screenTrack) {
                p.peer.replaceTrack(screenTrack, videoTrack, stream);
            }
        });

        if (myVideo.current) {
            myVideo.current.srcObject = stream;
        }
        setIsScreenSharing(false);
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
        }
    }, [stream]);

    const toggleScreenShare = useCallback(async () => {
        if (!navigator.mediaDevices.getDisplayMedia) {
            alert("Screen sharing is not supported in this browser. Please use a desktop browser or a modern mobile browser like Chrome/Safari.");
            return;
        }

        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true, // More robust for mobile support
                    cursor: "always"
                });
                const screenTrack = screenStream.getTracks()[0];

                // Single call track replacement
                if (connectionRef.current) {
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                        connectionRef.current.replaceTrack(videoTrack, screenTrack, stream);
                    }
                }

                // Group call track replacement
                peersRef.current.forEach(p => {
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                        p.peer.replaceTrack(videoTrack, screenTrack, stream);
                    }
                });

                if (myVideo.current) {
                    myVideo.current.srcObject = screenStream;
                }
                setIsScreenSharing(true);

                screenTrack.onended = () => {
                    stopScreenSharing(screenStream);
                };
            } catch (error) {
                console.error("Error sharing screen:", error);
                if (error.name === 'NotAllowedError') {
                    alert("Permission to share screen was denied.");
                } else {
                    alert("Unable to start screen sharing. Note: Some mobile browsers restrict this feature for privacy.");
                }
            }
        } else {
            const screenStream = myVideo.current.srcObject;
            stopScreenSharing(screenStream);
        }
    }, [isScreenSharing, stream, stopScreenSharing]);

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

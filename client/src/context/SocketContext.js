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

    const handleCallTermination = useCallback(() => {
        console.log("☎️ Call Termination cleaning up...");
        setCallEnded(true);
        if (connectionRef.current) {
            try {
                connectionRef.current.destroy();
                connectionRef.current = null;
            } catch (e) { }
        }
        setCall({});
        setCallAccepted(false);
        setRemoteStream(null);
        setIsScreenSharing(false);
        setIsVideoMuted(false);
        setIsAudioMuted(false);

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
        });

        newSocket.on('callEnded', () => {
            console.log("📉 CALL ENDED BY REMOTE");
            handleCallTermination();
        });

        return () => {
            if (newSocket) {
                console.log("🔌 Disconnecting Socket");
                newSocket.disconnect();
                setSocket(null);
            }
        };
    }, [userId, user, handleCallTermination]); // Include user to satisfy ESLint

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

    const callUser = useCallback((id, type, currentStream) => {
        console.log("📞 Initiating Call to:", id, "Type:", type);
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

                if (connectionRef.current) {
                    const videoTrack = stream.getVideoTracks()[0];
                    connectionRef.current.replaceTrack(videoTrack, screenTrack, stream);
                }

                myVideo.current.srcObject = screenStream;
                setIsScreenSharing(true);

                screenTrack.onended = () => {
                    const videoTrack = stream.getVideoTracks()[0];
                    if (connectionRef.current) {
                        connectionRef.current.replaceTrack(screenTrack, videoTrack, stream);
                    }
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
            toggleScreenShare
        }}>
            {children}
        </SocketContext.Provider>
    );
};

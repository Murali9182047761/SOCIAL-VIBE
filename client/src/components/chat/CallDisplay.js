import React, { useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { ChatState } from '../../context/ChatProvider';
import {
    MdVideocam,
    MdVideocamOff,
    MdCallEnd,
    MdCall,
    MdMic,
    MdMicOff,
    MdScreenShare,
    MdStopScreenShare
} from 'react-icons/md';

const GroupVideoParticipant = ({ peerObj }) => {
    const ref = useRef();

    useEffect(() => {
        peerObj.peer.on("stream", stream => {
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        });
    }, [peerObj]);

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#222',
            border: '2px solid rgba(255,255,255,0.1)'
        }}>
            <video playsInline autoPlay ref={ref} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.5)',
                padding: '2px 10px',
                borderRadius: '4px',
                fontSize: '12px'
            }}>
                {peerObj.userName || 'Participant'}
            </div>
        </div>
    );
};

const CallDisplay = () => {
    const {
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        remoteStream,
        callEnded,
        answerCall,
        leaveCall,
        setStream,
        callType,
        isVideoMuted,
        isAudioMuted,
        isScreenSharing,
        toggleVideo,
        toggleAudio,
        toggleScreenShare,
        callStatus,
        // Group Call
        isGroupCall,
        groupPeers,
        leaveGroupCall
    } = useSocket();

    const { selectedChat } = ChatState();

    useEffect(() => {
        if ((call.isReceivingCall && !callAccepted) || (call.isCalling && !callAccepted) || (callAccepted && !callEnded) || (stream)) {
            // Prevent body scroll when call is active
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, [call.isReceivingCall, call.isCalling, callAccepted, callEnded, stream, call, callType]);

    useEffect(() => {
        if (myVideo.current && stream && !isScreenSharing) {
            myVideo.current.srcObject = stream;
        }
    }, [stream, myVideo, isScreenSharing, callAccepted]);

    useEffect(() => {
        if (userVideo.current && remoteStream) {
            userVideo.current.srcObject = remoteStream;
        }
    }, [remoteStream, userVideo, callAccepted]);

    if (!call.isReceivingCall && !call.isCalling && !stream && !callAccepted) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            backdropFilter: 'blur(10px)'
        }}>
            {/* Incoming Call Notification */}
            {call.isReceivingCall && !callAccepted && (
                <div style={{
                    textAlign: 'center',
                    background: 'rgba(34, 34, 34, 0.9)',
                    padding: '50px',
                    borderRadius: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'linear-gradient(45deg, #6e8efb, #a777e3)',
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '40px',
                            fontWeight: 'bold'
                        }}>
                            {call.name ? call.name[0].toUpperCase() : '?'}
                        </div>
                    </div>
                    <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>{call.name}</h2>
                    <p style={{ color: '#aaa', marginBottom: '30px' }}>
                        is {call.type === 'video' ? 'video calling' : 'voice calling'} you...
                    </p>
                    <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
                        <button
                            onClick={async () => {
                                try {
                                    const mediaStream = await navigator.mediaDevices.getUserMedia({
                                        video: call.type === 'video',
                                        audio: true
                                    });
                                    setStream(mediaStream);
                                    answerCall(mediaStream);
                                } catch (err) {
                                    alert("Camera/Microphone access denied");
                                }
                            }}
                            style={{
                                background: '#2ecc71',
                                border: 'none',
                                borderRadius: '50%',
                                width: '70px',
                                height: '70px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 15px rgba(46, 204, 113, 0.4)'
                            }}
                        >
                            {call.type === 'video' ? <MdVideocam size={35} /> : <MdCall size={35} />}
                        </button>
                        <button
                            onClick={() => leaveCall(call.from)}
                            style={{
                                background: '#e74c3c',
                                border: 'none',
                                borderRadius: '50%',
                                width: '70px',
                                height: '70px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)'
                            }}
                        >
                            <MdCallEnd size={35} />
                        </button>
                    </div>
                </div>
            )}

            {/* Outgoing Call Notification */}
            {call.isCalling && !callAccepted && (
                <div style={{
                    textAlign: 'center',
                    background: 'rgba(34, 34, 34, 0.9)',
                    padding: '50px',
                    borderRadius: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'linear-gradient(45deg, #6e8efb, #a777e3)',
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '40px',
                            fontWeight: 'bold'
                        }}>
                            {call.name ? call.name[0].toUpperCase() : '?'}
                        </div>
                    </div>
                    <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>{call.name}</h2>
                    <p style={{ color: '#6e8efb', fontSize: '20px', fontWeight: '500', marginBottom: '30px' }}>
                        {callStatus || 'Calling...'}
                    </p>
                    <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
                        <button
                            onClick={() => leaveCall()}
                            style={{
                                background: '#e74c3c',
                                border: 'none',
                                borderRadius: '50%',
                                width: '70px',
                                height: '70px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                transition: 'transform 0.2s',
                                boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)'
                            }}
                        >
                            <MdCallEnd size={35} />
                        </button>
                    </div>
                </div>
            )}

            {/* Active Call Window */}
            {(callAccepted && !callEnded) && (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>

                    {isGroupCall ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: groupPeers.length <= 1 ? '1fr' : groupPeers.length <= 3 ? '1fr 1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '20px',
                            width: '100%',
                            height: 'calc(100% - 120px)',
                            padding: '20px'
                        }}>
                            {/* My Video in Grid */}
                            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--primary-color)', background: '#000' }}>
                                <video playsInline muted ref={myVideo} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: isVideoMuted && !isScreenSharing ? 'none' : 'block' }} />
                                {isVideoMuted && !isScreenSharing && (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                                        <MdVideocamOff size={40} color="#555" />
                                    </div>
                                )}
                                <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.5)', padding: '2px 10px', borderRadius: '4px', fontSize: '12px' }}>You</div>
                            </div>

                            {/* Remote Peers in Grid */}
                            {groupPeers.map((peerObj, index) => (
                                <GroupVideoParticipant key={index} peerObj={peerObj} />
                            ))}
                        </div>
                    ) : (
                        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {callType === 'video' ? (
                                <>
                                    {/* Other person's video (Full screen) */}
                                    <video playsInline ref={userVideo} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                    {/* My video (Small overlay) */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '30px',
                                        right: '30px',
                                        width: '180px',
                                        height: '120px',
                                        borderRadius: '12px',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                        overflow: 'hidden',
                                        background: '#000'
                                    }}>
                                        <video playsInline muted ref={myVideo} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: isVideoMuted && !isScreenSharing ? 'none' : 'block' }} />
                                        {isVideoMuted && !isScreenSharing && (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                                                <MdVideocamOff size={40} color="#555" />
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: '180px',
                                        height: '180px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(45deg, #2c3e50, #000)',
                                        margin: '0 auto 30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '4px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <MdCall size={80} color="#6e8efb" />
                                    </div>
                                    <h2 style={{ fontSize: '32px' }}>{call.name || "Active Call"}</h2>
                                    <p style={{ color: '#aaa', marginTop: '10px' }}>Voice Call in progress...</p>
                                    <video playsInline ref={userVideo} autoPlay style={{ display: 'none' }} />
                                    <video playsInline muted ref={myVideo} autoPlay style={{ display: 'none' }} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Enhanced Call Controls */}
                    <div style={{
                        position: 'absolute',
                        bottom: '40px',
                        display: 'flex',
                        gap: '20px',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '15px 30px',
                        borderRadius: '40px',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        zIndex: 100
                    }}>
                        {/* Audio Toggle */}
                        <button
                            onClick={toggleAudio}
                            style={{
                                background: isAudioMuted ? '#e74c3c' : 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '55px',
                                height: '55px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isAudioMuted ? <MdMicOff size={28} /> : <MdMic size={28} />}
                        </button>

                        {/* Video Toggle */}
                        {callType === 'video' && (
                            <button
                                onClick={toggleVideo}
                                style={{
                                    background: isVideoMuted ? '#e74c3c' : 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '55px',
                                    height: '55px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isVideoMuted ? <MdVideocamOff size={28} /> : <MdVideocam size={28} />}
                            </button>
                        )}

                        {/* Screen Share Toggle */}
                        {callType === 'video' && (
                            <button
                                onClick={toggleScreenShare}
                                style={{
                                    background: isScreenSharing ? '#3498db' : 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '55px',
                                    height: '55px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isScreenSharing ? <MdStopScreenShare size={28} /> : <MdScreenShare size={28} />}
                            </button>
                        )}

                        {/* End Call Button */}
                        <button
                            onClick={() => isGroupCall ? leaveGroupCall(selectedChat?._id) : leaveCall()}
                            style={{
                                background: '#e74c3c',
                                border: 'none',
                                borderRadius: '50%',
                                width: '55px',
                                height: '55px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 15px rgba(231, 76, 60, 0.4)'
                            }}
                        >
                            <MdCallEnd size={28} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallDisplay;

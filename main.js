let signalingServer = new WebSocket('ws://localhost:8080'); // Địa chỉ WebSocket của server signaling

let peerConnection = new RTCPeerConnection();
let localStream;
let remoteStream;

let init = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    remoteStream = new MediaStream();
    document.getElementById('user-1').srcObject = localStream;
    document.getElementById('user-2').srcObject = remoteStream;

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    };

    // Lắng nghe tin nhắn đến từ signaling server
    signalingServer.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        if (data.offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            signalingServer.send(JSON.stringify({ answer: peerConnection.localDescription }));
        } else if (data.answer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.iceCandidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.iceCandidate));
            } catch (e) {
                console.error('Error adding received ICE candidate', e);
            }
        }
    };
};

let createOffer = async () => {
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            signalingServer.send(JSON.stringify({ iceCandidate: event.candidate }));
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    signalingServer.send(JSON.stringify({ offer: peerConnection.localDescription }));
};

let createAnswer = async () => {
    let offer = JSON.parse(document.getElementById('offer-sdp').value);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            signalingServer.send(JSON.stringify({ iceCandidate: event.candidate }));
        }
    };

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    signalingServer.send(JSON.stringify({ answer: peerConnection.localDescription }));
};

let addAnswer = async () => {
    const answer = JSON.parse(document.getElementById('answer-sdp').value);
    await peerConnection.setRemoteDescription(answer);
};

init();

document.getElementById('create-offer').addEventListener('click', createOffer);
document.getElementById('create-answer').addEventListener('click', createAnswer);
document.getElementById('add-answer').addEventListener('click', addAnswer);

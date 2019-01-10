// getting dom elements
var divRoomSelection = document.getElementById('roomSelection');
var divMeetingRoom = document.getElementById('meetingRoom');
var inputRoom = document.getElementById('room');
var inputName = document.getElementById('name');
var inputPassword = document.getElementById('password');
var btnRegister = document.getElementById('register');
var btnWithToken = document.getElementById('withToken');

// variables
var roomName;
var userName;
var participants = {};

var iceServers = [{
  url: "turn:40.76.204.227:3478",
  username: "kurento",
  credential: "kurentow"
}];

var socket;

btnRegister.onclick = function () {
    roomName = inputRoom.value;
    userName = inputName.value;

    if (roomName === '' || userName === '') {
        alert('Room and Name are required!');
    } else { 
        login(userName, roomName);
    }
};

btnWithToken.onclick = function() {
    roomName = inputRoom.value;
    userName = inputName.value;
    password = inputPassword.value;

    if (roomName === '' || userName === '' || password === '') {
        alert('Room, password and name are required!');
    } else {
        fetch("https://evaeytkbve.eastus.cloudapp.azure.com/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `user=${userName}&password=${password}`
        }).then(res => {
            return res.json()
        }).then(authResponse => {
            alert('Using token to login: ' + authResponse.token);
            login(userName, roomName, authResponse.token);
        }).catch(err => {
            alert("Encounter error to join room: " + err.toString());
            console.error(err);
        });
    }
};

function login(userName, roomName, token) {
    initSocket("/", token);
    var message = {
        event: 'joinRoom',
        userName: userName,
        roomName: roomName
    }
    sendMessage(message);
    divRoomSelection.style = "display: none";
    divMeetingRoom.style = "display: block";
}

function initSocket(uri, token) {
    socket = io(
        uri, {
        transportOptions: {
          polling: {
            extraHeaders: {
              'Authorization': `Bearer ${token}`
            }
          }
        },
        upgrade: false,
        path: '/signal'
      }
    );

    // messages handlers
    socket.on('message', message => {
        console.log('Message received: ' + message.event);

        switch (message.event) {
            case 'newParticipantArrived':
                receiveVideo(message.userid, message.username);
                break;
            case 'existingParticipants':
                onExistingParticipants(message.userid, message.existingUsers);
                break;
            case 'receiveVideoAnswer':
                onReceiveVideoAnswer(message.senderid, message.sdpAnswer);
                break;
            case 'candidate':
                addIceCandidate(message.userid, message.candidate);
                break;
        }
    });

}

// handlers functions
function receiveVideo(userid, username) {
    var video = document.createElement('video');
    var div = document.createElement('div');
    div.className = "videoContainer";
    var name = document.createElement('div');
    video.id = userid;
    video.autoplay = true;
    name.appendChild(document.createTextNode(username));
    div.appendChild(video);
    div.appendChild(name);
    divMeetingRoom.appendChild(div);

    var user = {
        id: userid,
        username: username,
        video: video,
        rtcPeer: null
    }

    participants[user.id] = user;

    var options = {
        remoteVideo: video,
        onicecandidate: onIceCandidate,
        configuration: {
          iceServers: iceServers,
          iceTransportPolicy: "relay"
        }
    }

    user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
        function (err) {
            if (err) {
                return console.error(err);
            }
            this.generateOffer(onOffer);
        }
    );

    var onOffer = function (err, offer, wp) {
        console.log('sending offer');
        var message = {
            event: 'receiveVideoFrom',
            userid: user.id,
            roomName: roomName,
            sdpOffer: offer
        }
        sendMessage(message);
    }

    function onIceCandidate(candidate, wp) {
        console.log('sending ice candidates');
        var message = {
            event: 'candidate',
            userid: user.id,
            roomName: roomName,
            candidate: candidate
        }
        sendMessage(message);
    }
}

function onExistingParticipants(userid, existingUsers) {
    var video = document.createElement('video');
    var div = document.createElement('div');
    div.className = "videoContainer";
    var name = document.createElement('div');
    video.id = userid;
    video.autoplay = true;
    name.appendChild(document.createTextNode(userName));
    div.appendChild(video);
    div.appendChild(name);
    divMeetingRoom.appendChild(div);

    var user = {
        id: userid,
        username: userName,
        video: video,
        rtcPeer: null
    }

    participants[user.id] = user;

    var constraints = {
        audio: true,
        video : {
			mandatory : {
				maxWidth : 320,
				maxFrameRate : 15,
				minFrameRate : 15
			}
		}
    };

    var options = {
        localVideo: video,
        mediaConstraints: constraints,
        onicecandidate: onIceCandidate,
        configuration: {
          iceServers: iceServers,
          iceTransportPolicy: "relay"
        }
    }

    user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,
        function (err) {
            if (err) {
                return console.error(err);
            }
            this.generateOffer(onOffer)
        }
    );

    existingUsers.forEach(function (element) {
        receiveVideo(element.id, element.name);
    });

    var onOffer = function (err, offer, wp) {
        console.log('sending offer');
        var message = {
            event: 'receiveVideoFrom',
            userid: user.id,
            roomName: roomName,
            sdpOffer: offer
        }
        sendMessage(message);
    }

    function onIceCandidate(candidate, wp) {
        console.log('sending ice candidates');
        var message = {
            event: 'candidate',
            userid: user.id,
            roomName: roomName,
            candidate: candidate
        }
        sendMessage(message);
    }
}

function onReceiveVideoAnswer(senderid, sdpAnswer) {
    participants[senderid].rtcPeer.processAnswer(sdpAnswer);
}

function addIceCandidate(userid, candidate) {
    participants[userid].rtcPeer.addIceCandidate(candidate);
}

// utilities
function sendMessage(message) {
    console.log('sending ' + message.event + ' message to server');
    socket.emit('message', message);
}

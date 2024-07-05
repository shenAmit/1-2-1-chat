<template>
  <div>
    <div v-if="loading">Requesting access to camera and microphone...</div>
    <div v-if="error">{{ error }}</div>
    <video
      ref="userVideo"
      autoplay
      playsinline
      v-if="!loading && !error"
    ></video>
    <video
      ref="partnerVideo"
      autoplay
      playsinline
      v-if="!loading && !error"
    ></video>
  </div>
</template>

<script>
import io from "socket.io-client";
import SimplePeer from "simple-peer";

export default {
  data() {
    return {
      socket: null,
      userVideo: null,
      partnerVideo: null,
      peers: [],
      loading: true,
      error: null,
    };
  },
  mounted() {
    this.socket = io("http://localhost:8000");
    this.userVideo = this.$refs.userVideo;
    this.partnerVideo = this.$refs.partnerVideo;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        this.loading = false;
        this.userVideo.srcObject = stream;

        this.socket.emit("join-room", "room1");

        this.socket.on("user-connected", (userId) => {
          this.callUser(userId, stream);
        });

        this.socket.on("user-disconnected", (userId) => {
          if (this.peers[userId]) {
            this.peers[userId].destroy();
          }
        });

        this.socket.on("user-joined", ({ signal, callerID }) => {
          const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: stream,
          });

          peer.on("signal", (signal) => {
            this.socket.emit("return-signal", { signal, callerID });
          });

          peer.signal(signal);

          peer.on("stream", (stream) => {
            this.partnerVideo.srcObject = stream;
          });

          this.peers[callerID] = peer;
        });

        this.socket.on("received-returned-signal", ({ signal, id }) => {
          this.peers[id].signal(signal);
        });
      })
      .catch((error) => {
        this.loading = false;
        this.error = `Error accessing media devices: ${error.message}`;
        console.error("Error accessing media devices:", error);
      });
  },
  methods: {
    callUser(userId, stream) {
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: stream,
      });

      peer.on("signal", (signal) => {
        this.socket.emit("send-signal", {
          userToSignal: userId,
          signal,
          callerID: this.socket.id,
        });
      });

      peer.on("stream", (stream) => {
        this.partnerVideo.srcObject = stream;
      });

      this.peers[userId] = peer;
    },
  },
};
</script>

<style scoped>
video {
  width: 50%;
}
</style>

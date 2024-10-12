import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Container, Paper, Typography, Box, Fab, Button, AppBar, Toolbar } from "@mui/material";
import { Mic } from "@mui/icons-material";
import { styled } from "@mui/system";

// Styled components for chat bubbles.
const ChatBubble = styled(Paper)(({ theme, role }) => ({
  padding: "1rem",
  margin: "0.5rem 0",
  borderRadius: "20px",
  backgroundColor: role === "user" ? "#e0f7fa" : "#e1bee7",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
}));

const Header = styled(AppBar)({
  backgroundColor: "#005c99",
  color: "#ffffff",
});

const VoiceRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [chat, setChat] = useState([]);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  const API_URL = 'https://voiceassistantbackend-production.up.railway.app';
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "es-ES";

      recognitionRef.current.onresult = async (event) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;
        setTranscript(transcriptText);
        setChat((prevChat) => [{ role: "user", content: transcriptText }, ...prevChat]);

        try {
          const result = await axios.post(`${API_URL}/api/generate-response`, { transcript: transcriptText });
          setResponse(result.data.response);
          setChat((prevChat) => [{ role: "assistant", content: result.data.response }, ...prevChat]);
        } catch (error) {
          console.error("Error generating response: ", error);
          setResponse("Could not generate a response. Check the backend.");
          setChat((prevChat) => [{ role: "assistant", content: "Could not generate a response. Check the backend." }, ...prevChat]);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Voice recognition error: ", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          recognitionRef.current.stop();
          setIsRecognitionActive(false);
        }
      };
    }
  }, []);

  const handleMouseDown = () => {
    if (!isRecognitionActive) {
      recognitionRef.current.start();
      setIsRecognitionActive(true);
    }
  };

  const handleMouseUp = () => {
    if (isRecognitionActive) {
      recognitionRef.current.stop();
      setIsRecognitionActive(false);
    }
  };

  // Touch event handlers for mobile compatibility
  const handleTouchStart = () => {
    if (!isRecognitionActive) {
      recognitionRef.current.start();
      setIsRecognitionActive(true);
    }
  };

  const handleTouchEnd = () => {
    if (isRecognitionActive) {
      recognitionRef.current.stop();
      setIsRecognitionActive(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  return (
    <Container maxWidth="sm" sx={{ padding: "1rem", marginTop: "1rem" }}>
      <Header position="static">
        <Toolbar>
          <Typography variant="h6">Voice Assistant</Typography>
        </Toolbar>
      </Header>

      <Box
        sx={{
          backgroundColor: "#f3f4f6",
          padding: "1.5rem",
          borderRadius: "12px",
          height: "60vh",
          overflowY: "auto",
          margin: "1rem 0",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        {chat.slice().reverse().map((message, index) => (
          <ChatBubble key={index} role={message.role}>
            <Typography variant="body1">{message.content}</Typography>
          </ChatBubble>
        ))}
        <div ref={chatEndRef} />
      </Box>

      <Typography align="center" variant="body2" color="textSecondary" sx={{ marginBottom: "1rem" }}>
        Press the button or space bar to speak
      </Typography>

      <Box display="flex" justifyContent="center" mb={3}>
        <Fab
          size="large"
          color={isRecognitionActive ? "secondary" : "primary"}
          aria-label="voice-control"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart} // Mobile handling
          onTouchEnd={handleTouchEnd}     // Mobile handling
          sx={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            transition: "0.3s",
            '&:hover': {
              transform: "scale(1.1)",
            },
            '&:active': {
              transform: "scale(0.9)",  // Scale down during touch
            },
          }}
        >
          <Mic />
        </Fab>
      </Box>

      <Box display="flex" justifyContent="space-between" sx={{ backgroundColor: "#e7e9eb", padding: "0.5rem", borderRadius: "8px" }}>
        <Typography variant="body2" color="textSecondary">
          💳 Credits: 8
        </Typography>
        <Button variant="contained" color="primary" sx={{ borderRadius: "20px" }}>
          Buy Credits
        </Button>
      </Box>
    </Container>
  );
};

export default VoiceRecognition;

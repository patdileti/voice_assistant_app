import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import {
  Container,
  Paper,
  Typography,
  Box,
  Fab,
  Button,
  AppBar,
  Toolbar,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
} from "@mui/material";
import { Mic, MicOff, VolumeUp, VolumeOff } from "@mui/icons-material";
import { styled } from "@mui/system";

const ChatBubble = styled(Paper)(({ theme, role }) => ({
  padding: "1rem",
  margin: "0.5rem 0",
  borderRadius: "20px",
  backgroundColor: role === "user" ? "#e0f7fa" : "#e1bee7",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
  maxWidth: "80%",
  alignSelf: role === "user" ? "flex-end" : "flex-start",
}));

const Header = styled(AppBar)({
  backgroundColor: "#1976d2",
  color: "#ffffff",
});

const VoiceRecognition = () => {
  const languageOptions = [
    { value: "es-ES", label: "Español" },
    { value: "en-US", label: "English (US)" },
    { value: "fr-FR", label: "Français" },
    { value: "de-DE", label: "Deutsch" },
    { value: "it-IT", label: "Italiano" },
    { value: "pt-PT", label: "Português" },
  ];

  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [chat, setChat] = useState([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState(languageOptions[0].value);
  const [sessionId] = useState(uuidv4());
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  //const API_URL = 'http://localhost:5000';
  const API_URL = 'https://voiceassistantbackend-production.up.railway.app';
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const initializeSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.removeEventListener('result', handleResult);
      recognitionRef.current.removeEventListener('end', handleEnd);
      recognitionRef.current.abort();
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = selectedLanguage;

    recognitionRef.current.addEventListener('result', handleResult);
    recognitionRef.current.addEventListener('end', handleEnd);
  }, [selectedLanguage]);

  const handleResult = async (event) => {
    const current = event.resultIndex;
    const transcriptText = event.results[current][0].transcript;
    setTranscript(transcriptText);
    setChat((prevChat) => [{ role: "user", content: transcriptText }, ...prevChat]);

    try {
      console.log("Sending transcript to API: ", transcriptText);
      
      const result = await axios.post(`${API_URL}/api/generate-response`, { 
        transcript: transcriptText,
        sessionId: sessionId
      });
      
      console.log("API Response:", result.data);

      const responseText = result.data.response;
      setResponse(responseText);
      setChat((prevChat) => [{ role: "assistant", content: responseText }, ...prevChat]);
      if (isVoiceEnabled) {
        speak(responseText);
      }
    } catch (error) {
      console.error("Error generating response: ", error);
      const errorMessage = "Could not generate a response. Check the backend.";
      setResponse(errorMessage);
      setChat((prevChat) => [{ role: "assistant", content: errorMessage }, ...prevChat]);
      if (isVoiceEnabled) {
        speak(errorMessage);
      }
    }
  };

  const handleEnd = () => {
    setIsRecognitionActive(false);
  };

  useEffect(() => {
    initializeSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.removeEventListener('result', handleResult);
        recognitionRef.current.removeEventListener('end', handleEnd);
        recognitionRef.current.abort();
      }
    };
  }, [initializeSpeechRecognition]);

  const speak = useCallback((text) => {
    if (isVoiceEnabled && synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLanguage;
      utterance.onend = () => console.log('Speech synthesis finished');
      utterance.onerror = (event) => console.error('Speech synthesis error', event);
      synthRef.current.speak(utterance);
    }
  }, [isVoiceEnabled, selectedLanguage]);

  const startRecognition = useCallback(() => {
    if (!isRecognitionActive && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecognitionActive(true);
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setIsRecognitionActive(false);
      }
    }
  }, [isRecognitionActive]);

  const stopRecognition = useCallback(() => {
    if (isRecognitionActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Failed to stop speech recognition:", error);
      } finally {
        setIsRecognitionActive(false);
      }
    }
  }, [isRecognitionActive]);

  const toggleVoice = () => {
    setIsVoiceEnabled(prev => {
      if (prev) {
        synthRef.current.cancel();
      }
      return !prev;
    });
  };

  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
    stopRecognition();
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  return (
    <Container maxWidth="sm" sx={{ padding: "1rem", marginTop: "1rem" }}>
      <Header position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Voice Assistant</Typography>
          <IconButton color="inherit" onClick={toggleVoice}>
            {isVoiceEnabled ? <VolumeUp /> : <VolumeOff />}
          </IconButton>
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
          display: "flex",
          flexDirection: "column-reverse",
        }}
      >
        <div ref={chatEndRef} />
        {chat.map((message, index) => (
          <ChatBubble key={index} role={message.role}>
            <Typography variant="body1">{message.content}</Typography>
          </ChatBubble>
        ))}
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="language-select-label">Language</InputLabel>
          <Select
            labelId="language-select-label"
            id="language-select"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            label="Language"
          >
            {languageOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Fab
          color={isRecognitionActive ? "secondary" : "primary"}
          aria-label="voice-control"
          onMouseDown={startRecognition}
          onMouseUp={stopRecognition}
          onTouchStart={startRecognition}
          onTouchEnd={stopRecognition}
          sx={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            transition: "0.3s",
            '&:hover': {
              transform: "scale(1.1)",
            },
            '&:active': {
              transform: "scale(0.9)",
            },
          }}
        >
          {isRecognitionActive ? <MicOff /> : <Mic />}
        </Fab>
      </Box>

      <Box 
        display="flex" 
        justifyContent="space-between" 
        sx={{ 
          backgroundColor: "#e7e9eb", 
          padding: "1rem", 
          borderRadius: "8px",
          alignItems: "center"
        }}
      >
        <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 'bold' }}>
          💳 Credits: 8
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ 
            borderRadius: "20px",
            textTransform: 'none',
            fontWeight: 'bold'
          }}
        >
          Buy Credits
        </Button>
      </Box>
    </Container>
  );
};

export default VoiceRecognition;
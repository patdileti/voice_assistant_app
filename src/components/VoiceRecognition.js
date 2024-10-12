import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Container, Paper, Typography, AppBar, Toolbar, Fab } from "@mui/material";
import { Mic, MicOff } from "@mui/icons-material";

const VoiceRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [chat, setChat] = useState([]);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  //const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const API_URL = process.env.REACT_APP_API_URL;


  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

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
        setChat((prevChat) => [
          { role: "user", content: transcriptText },
          ...prevChat,
        ]);

        try {
          const result = await axios.post(
            `${API_URL}/api/generate-response`,
            { transcript: transcriptText }
          );
          setResponse(result.data.response);
          setChat((prevChat) => [
            { role: "assistant", content: result.data.response },
            ...prevChat,
          ]);
        } catch (error) {
          console.error("Error al generar respuesta: ", error);
          setResponse("No se pudo generar una respuesta. Verifica el backend.");
          setChat((prevChat) => [
            {
              role: "assistant",
              content: "No se pudo generar una respuesta. Verifica el backend.",
            },
            ...prevChat,
          ]);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Error en reconocimiento de voz: ", event.error);
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          recognitionRef.current.stop();
          setIsRecognitionActive(false);
        }
      };
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === " " && !isRecognitionActive) {
        event.preventDefault();
        recognitionRef.current.start();
        setIsRecognitionActive(true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === " " && isRecognitionActive) {
        event.preventDefault();
        recognitionRef.current.stop();
        setIsRecognitionActive(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isRecognitionActive]);

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

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  return (
    <Container maxWidth="sm" style={{ padding: "1rem", marginTop: "1rem" }}>
      <div
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ height: "80vh" }}
      >
        <AppBar
          position="static"
          elevation={3}
          style={{ backgroundColor: "#1976d2" }}
        >
          <Toolbar>
            <Typography variant="h6" component="div">
              Asistente de Voz
            </Typography>
          </Toolbar>
        </AppBar>

        <div
          className="chat-container"
          style={{
            backgroundColor: "#f0f4f8",
            padding: "1rem",
            borderRadius: "8px",
            maxHeight: "60vh",
            overflowY: "auto",
            marginTop: "1rem",
          }}
        >
          {chat
            .slice()
            .reverse()
            .map((message, index) => (
              <Paper
                key={index}
                elevation={3}
                style={{
                  padding: "1rem",
                  margin: "0.5rem 0",
                  backgroundColor:
                    message.role === "user" ? "#f5f5f5" : "#e3f2fd",
                }}
              >
                <Typography variant="subtitle1" color="textSecondary">
                  {message.role === "user" ? "Usuario:" : "Asistente:"}
                </Typography>
                <Typography variant="body1">{message.content}</Typography>
              </Paper>
            ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      <Fab
        size="small"
        color="primary"
        aria-label="voice-control"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ position: "fixed", bottom: "2rem", right: "2rem" }}
      >
        {isRecognitionActive ? <Mic /> : <MicOff />}
      </Fab>
    </Container>
  );
};

export default VoiceRecognition;
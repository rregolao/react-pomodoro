import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Text,
  Input,
  FormControl,
  FormLabel,
  Center,
  HStack,
  Badge,
} from "@chakra-ui/react";

const FOCO_PADRAO = 25;
const PAUSA_PADRAO = 5;

// Toca um "beep" simples via Web Audio API, sem depender de nenhum arquivo
// de áudio externo.
const tocarSom = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  } catch {
    // Ambientes sem suporte a Web Audio (ex.: alguns testes automatizados)
    // simplesmente não tocam o som — não é um erro fatal para o timer.
  }
};

const PomodoroTimer = () => {
  const [modo, setModo] = useState("foco"); // "foco" | "pausa"
  const [focoMinutos, setFocoMinutos] = useState(FOCO_PADRAO);
  const [pausaMinutos, setPausaMinutos] = useState(PAUSA_PADRAO);
  const [isActive, setIsActive] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(FOCO_PADRAO * 60);
  const [mensagem, setMensagem] = useState(null);

  // Guardamos o timestamp real de término em vez de decrementar segundo a
  // segundo: assim o cronômetro não sofre deriva (drift) por causa do tempo
  // que o próprio setInterval leva para dar o "tick", já que a cada
  // renderização recalculamos o tempo restante a partir do relógio real.
  const fimRef = useRef(null);

  const duracaoAtualEmSegundos = useCallback(
    () => (modo === "foco" ? focoMinutos : pausaMinutos) * 60,
    [modo, focoMinutos, pausaMinutos]
  );

  useEffect(() => {
    if (!isActive) return undefined;

    if (fimRef.current === null) {
      fimRef.current = Date.now() + tempoRestante * 1000;
    }

    const interval = setInterval(() => {
      const restante = Math.round((fimRef.current - Date.now()) / 1000);

      if (restante <= 0) {
        clearInterval(interval);
        fimRef.current = null;
        tocarSom();

        const proximoModo = modo === "foco" ? "pausa" : "foco";
        setMensagem(
          modo === "foco"
            ? "Tempo de foco encerrado! Hora da pausa."
            : "Pausa encerrada! Hora de focar."
        );
        setModo(proximoModo);
        setIsActive(false);
        setTempoRestante(
          (proximoModo === "foco" ? focoMinutos : pausaMinutos) * 60
        );
      } else {
        setTempoRestante(restante);
      }
    }, 250);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const toggleTimer = () => {
    if (!isActive) {
      fimRef.current = Date.now() + tempoRestante * 1000;
    } else {
      fimRef.current = null;
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    fimRef.current = null;
    setMensagem(null);
    setTempoRestante(duracaoAtualEmSegundos());
  };

  const trocarModoManualmente = (novoModo) => {
    if (isActive) return;
    setModo(novoModo);
    setMensagem(null);
    setTempoRestante(
      (novoModo === "foco" ? focoMinutos : pausaMinutos) * 60
    );
  };

  const validarEDefinirMinutos = (valor, setter) => {
    if (valor === "") {
      setter("");
      return;
    }
    const numero = parseInt(valor, 10);
    if (isNaN(numero) || numero < 1) return;
    const minutosClamped = Math.min(numero, 180);
    setter(minutosClamped);
  };

  const handleFocoChange = (e) => {
    validarEDefinirMinutos(e.target.value, setFocoMinutos);
    if (modo === "foco" && !isActive) {
      const numero = parseInt(e.target.value, 10);
      if (!isNaN(numero) && numero >= 1) {
        setTempoRestante(Math.min(numero, 180) * 60);
      }
    }
  };

  const handlePausaChange = (e) => {
    validarEDefinirMinutos(e.target.value, setPausaMinutos);
    if (modo === "pausa" && !isActive) {
      const numero = parseInt(e.target.value, 10);
      if (!isNaN(numero) && numero >= 1) {
        setTempoRestante(Math.min(numero, 180) * 60);
      }
    }
  };

  const minutosExibidos = Math.floor(tempoRestante / 60);
  const segundosExibidos = tempoRestante % 60;

  return (
    <Center>
      <Box width="100%" maxWidth="400px" p="4">
        <Badge
          colorScheme={modo === "foco" ? "green" : "blue"}
          fontSize="md"
          mb="2"
        >
          {modo === "foco" ? "Foco" : "Pausa"}
        </Badge>
        <Text fontSize="4xl" mb="2" textAlign="center">
          {String(minutosExibidos).padStart(2, "0")}:
          {String(segundosExibidos).padStart(2, "0")}
        </Text>
        {mensagem && (
          <Text role="alert" color="teal.500" mb="4" textAlign="center">
            {mensagem}
          </Text>
        )}
        <FormControl mb="4">
          <FormLabel>Foco (minutos)</FormLabel>
          <Input
            type="number"
            min="1"
            max="180"
            value={focoMinutos}
            onChange={handleFocoChange}
            isDisabled={isActive}
          />
        </FormControl>
        <FormControl mb="4">
          <FormLabel>Pausa (minutos)</FormLabel>
          <Input
            type="number"
            min="1"
            max="180"
            value={pausaMinutos}
            onChange={handlePausaChange}
            isDisabled={isActive}
          />
        </FormControl>
        <HStack spacing={4} mb="4">
          <Button
            size="sm"
            variant={modo === "foco" ? "solid" : "outline"}
            colorScheme="green"
            onClick={() => trocarModoManualmente("foco")}
            isDisabled={isActive}
          >
            Foco
          </Button>
          <Button
            size="sm"
            variant={modo === "pausa" ? "solid" : "outline"}
            colorScheme="blue"
            onClick={() => trocarModoManualmente("pausa")}
            isDisabled={isActive}
          >
            Pausa
          </Button>
        </HStack>
        <HStack spacing={4}>
          <Button
            colorScheme={isActive ? "red" : "green"}
            onClick={toggleTimer}
          >
            {isActive ? "Pausar" : "Iniciar"}
          </Button>
          <Button colorScheme="gray" onClick={resetTimer}>
            Reiniciar
          </Button>
        </HStack>
      </Box>
    </Center>
  );
};

export default PomodoroTimer;

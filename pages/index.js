import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import Layout from '@/components/layout/Layout';
import Image from 'next/image';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 3000;

const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-x: auto;
  background: transparent;
`;

const CanvasWrapper = styled.div`
  width: ${CANVAS_WIDTH}px;
  height: ${CANVAS_HEIGHT}px;
  position: relative;
  background: linear-gradient(180deg, #0b0a1c 0%, #91d3ff 50%, #fff9cbba 90%, #ffffff 100%);
  /* 원하는 그라데이션으로 */
  box-shadow: 0 0 24px 0 rgba(0,0,0,0.08);
`;

const DrawingCanvas = styled.canvas`
  width: ${CANVAS_WIDTH}px;
  height: ${CANVAS_HEIGHT}px;
  display: block;
  background: transparent;
  cursor: crosshair;
`;

// GuestbookOverlay 제거

// -- 메시지 표시 스타일 -- 
const PositionedMessage = styled.div`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  color: #111;
  font-family: 'Open Sans', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.2px;
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
  z-index: 10; /* 추가 이미지 위 */
`;

// MessageMeta 제거
/*
const MessageMeta = styled.small`
  margin-right: 0.5rem;
  flex-shrink: 0;
`;
*/

const MessageText = styled.span`
`;

// -- 동적 입력 필드 스타일 --
// InputArea 제거

const FloatingInput = styled.textarea`
  position: absolute;
  z-index: 20; /* 메시지 위 */
  padding: 0;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  /* 폰트 스타일은 최종 메시지와 동일하게 */
  color: #111;
  font-family: 'Open Sans', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.2px;
  /* 너비와 높이는 내용에 따라 자동 조절되도록 */
  min-height: 1em; /* 최소 높이 */
  width: auto; /* 너비 자동 */
  white-space: nowrap; /* 줄바꿈 방지 */
  overflow: hidden; /* 스크롤바 숨김 */
`;

// RotatedText는 현재 사용되지 않으므로 제거해도 무방
// const RotatedChar = ...
// const RotatedText = ...

// -- 가운데 이미지 스타일 --
const CenteredImageContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  max-width: 80vw;
  max-height: 80vh;
  cursor: pointer;
`;

// ExtraImagesContainer 및 ExtraImageWrapper 제거

const CenterTreeContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  width: 300px;
  height: 400px;
  pointer-events: none;
`;

// --- 컴포넌트 --- //
export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [guestbookEntries, setGuestbookEntries] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clickCoords, setClickCoords] = useState(null);
  const inputRef = useRef(null);
  const audioRef = useRef(null);
  const centerImageSrc = "/img/IMG_2064.WEBP";
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const pageContainerRef = useRef(null);

  // 마우스 위치 상태
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    audioRef.current = new Audio('/audio/music.mp3');
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouse({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 화면 중앙 기준 마우스 상대좌표
  const [center, setCenter] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const updateCenter = () => {
      setCenter({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    };
    updateCenter();
    window.addEventListener('resize', updateCenter);
    return () => window.removeEventListener('resize', updateCenter);
  }, []);

  // 마우스와 중앙의 거리
  const dx = mouse.x - center.x;
  const dy = mouse.y - center.y;

  // 잎사귀 흔들림 각도 계산 (예시: 5개 잎사귀)
  const leafAngles = [0, 30, -30, 60, -60].map((base, i) =>
    base + dx * 0.02 + Math.sin(dy * 0.01 + i) * 10
  );

  const fetchGuestbookEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/guestbook');
      if (!res.ok) throw new Error('Failed to fetch entries.');
      const data = await res.json();
      setGuestbookEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuestbookEntries();
  }, []);

  const handlePageClick = (e) => {
    // 이미지 클릭 시 오디오 재생 처리
    if (e.target.closest('.center-image')) {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
      return;
    }

    // 텍스트 입력 처리
    if (inputRef.current && document.activeElement === inputRef.current) {
      return;
    }
    if (e.target === inputRef.current) {
      return;
    }
    setClickCoords({ x: e.clientX, y: e.clientY });
    setNewMessage('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const submitMessage = async () => {
    if (!newMessage.trim() || !clickCoords || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: newMessage, 
          x: clickCoords.x, 
          y: clickCoords.y 
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save message.');
      }
      setNewMessage('');
      setClickCoords(null);
      await fetchGuestbookEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
    if (inputRef.current) {
      inputRef.current.style.width = `${Math.max(50, inputRef.current.value.length * 7)}px`;
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setClickCoords(null);
      setNewMessage('');
    }, 100);
  };

  // 최초 1회만 localStorage 그림 삭제
  useEffect(() => {
    localStorage.removeItem('drawing');
  }, []);

  // 캔버스 크기 고정 및 복원
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    restoreDrawing(canvas);
  }, []);

  // 드로잉 로직
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#222';

    let lastX = 0;
    let lastY = 0;

    const getCanvasRelativeCoords = (e) => {
      const canvas = canvasRef.current;
      // 문서 전체 기준에서 캔버스의 위치
      const rect = canvas.getBoundingClientRect();
      // 현재 스크롤 위치
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      // 마우스 위치 (문서 전체 기준)
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // 위 식은 결국 e.clientX - rect.left, e.clientY - rect.top과 동일
      // 하지만, 스크롤이 여러 레이어에 걸쳐 있을 때는 아래처럼 offsetTop/offsetLeft 누적이 더 안전
      let offsetX = e.clientX - rect.left;
      let offsetY = e.clientY - rect.top;
      return { x: offsetX, y: offsetY };
    };

    const handleMouseDown = (e) => {
      e.preventDefault();
      drawing.current = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    };
    const handleMouseMove = (e) => {
      e.preventDefault();
      if (!drawing.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastX = x;
      lastY = y;
    };
    const handleMouseUp = (e) => {
      e.preventDefault();
      drawing.current = false;
      saveDrawing(canvas);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, []);

  function saveDrawing(canvas) {
    try {
      const dataUrl = canvas.toDataURL();
      localStorage.setItem('drawing', dataUrl);
    } catch (e) {}
  }

  function restoreDrawing(canvas) {
    const dataUrl = localStorage.getItem('drawing');
    if (dataUrl) {
      const img = new window.Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = dataUrl;
    }
  }

  return (
    <Layout>
      <PageContainer ref={pageContainerRef} onClick={handlePageClick}>
        <CanvasWrapper>
          <DrawingCanvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            tabIndex={-1}
          />
        </CanvasWrapper>
        {guestbookEntries.map((entry) => (
          <PositionedMessage key={entry.id} x={entry.x} y={entry.y}>
            {entry.text}
          </PositionedMessage>
        ))}

        {clickCoords && (
          <FloatingInput
            ref={inputRef}
            style={{
              top: `${clickCoords.y}px`,
              left: `${clickCoords.x}px`,
              width: '50px'
            }}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={isLoading}
            rows="1"
            autoFocus
          />
        )}

        {isPlaying && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            color: 'black',
            fontSize: '50px',
            zIndex: 1000
          }}>
            ☃︎
          </div>
        )}
      </PageContainer>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import styled from 'styled-components';

const Cursor = styled.div`
  font-size: 60px;
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
`;

// 기본 이모지 목록 확장
const DEFAULT_EMOJIS = [
  // 포유류
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
  // 큰 포유류
  '🦒', '🦘', '🦬', '🦛', '🐘', '🦏', '🦣', '🐪', '🐫',
  // 가축 및 농장 동물
  '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐',
  // 반려동물 품종
  '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛',
  // 조류
  '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🦅', '🦆', '🦉',
  // 작은 포유류
  '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔',
  // 파충류 및 양서류
  '🐊', '🐢', '🦎', '🐍', '🐉', '🐲',
  // 해양 생물
  '🐠', '🐟', '🐡', '🐬', '🐳', '🐋', '🦈', '🦭', '🐙', '🦑',
  // 곤충 및 작은 생물
  '🐌', '🦋', '🐛', '🐜', '🐝', '🐞', '🦗', '🦂', '🦟', '🦐', '🦞', '🦀',
  // 영장류
  '🦧', '🦍', '🐒'
];

const CustomCursor = () => {
  const [positions, setPositions] = useState([]);
  const [emojis, setEmojis] = useState(DEFAULT_EMOJIS);

  useEffect(() => {
    let timer;
    const onMouseMove = (e) => {
      if (!timer && emojis.length > 0) {
        timer = setTimeout(() => {
          setPositions(prev => {
            const randomIndex = Math.floor(Math.random() * emojis.length);
            const newPositions = [...prev, { 
              x: e.clientX, 
              y: e.clientY,
              emoji: emojis[randomIndex]
            }];
            if (newPositions.length > 10) {
              return newPositions.slice(1);
            }
            return newPositions;
          });
          timer = null;
        }, 300);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (timer) clearTimeout(timer);
    };
  }, [emojis]);

  return (
    <>
      {positions.map((pos, index) => (
        <Cursor
          key={index}
          style={{
            left: `${pos.x}px`,
            top: `${pos.y}px`
          }}
        >
          {pos.emoji}
        </Cursor>
      ))}
    </>
  );
};

export default CustomCursor;
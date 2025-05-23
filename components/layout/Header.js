import styled from 'styled-components';
import Link from 'next/link';

const HeaderContainer = styled.header`
  padding: 1.3rem 2rem 1rem 2rem;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 1000;
`;

const Nav = styled.div`
  position: relative;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
`;

const Name = styled.span`
  font-size: 0.7rem;
  color: #000;
  position: absolute;
  left: 0;
  font-weight: 400;
  letter-spacing: 0.5px;
  font-family: 'Open Sans', sans-serif;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 0.8;
  }
`;

const Email = styled.a`
  font-size: 0.7rem;
  color: #000;
  position: absolute;
  right: 0;
  font-weight: 400;
  letter-spacing: 0.5px;
  font-family: 'Open Sans', sans-serif;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 0.8;
  }
`;

const Header = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <HeaderContainer>
      <Nav>
        <Name onClick={handleRefresh}>Eunjae Ahn</Name>
        <Email href="mailto:nsidesilveras@gmail.com">nsidesilveras@gmail.com</Email>
      </Nav>
    </HeaderContainer>
  );
};

export default Header;

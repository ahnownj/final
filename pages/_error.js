import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Error({ statusCode }) {
  const router = useRouter();

  useEffect(() => {
    if (statusCode === 404) {
      router.push('/');
    }
  }, [statusCode, router]);

  return null;
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
}; 
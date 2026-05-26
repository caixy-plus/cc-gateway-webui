import React, { useEffect, useRef } from 'react';

interface Props {
  message: string;
  isError: boolean;
  onClose: () => void;
}

export const Toast: React.FC<Props> = ({ message, isError, onClose }) => {
  // Store onClose in a ref to avoid re-triggering the timeout when the callback
  // reference changes between renders (e.g., due to useCallback identity change).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current(), 3000);
    return () => clearTimeout(t);
  }, []);

  return <div className={`toast ${isError ? 'error' : ''}`}>{message}</div>;
};

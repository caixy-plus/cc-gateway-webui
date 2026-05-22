import React, { useEffect } from 'react';

interface Props {
  message: string;
  isError: boolean;
  onClose: () => void;
}

export const Toast: React.FC<Props> = ({ message, isError, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${isError ? 'error' : ''}`}>{message}</div>;
};

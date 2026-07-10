import { useEffect, useRef } from 'react';
import { Chessground } from 'chessground';
import { Config } from 'chessground/config';
import { Api } from 'chessground/api';

interface ChessBoardProps {
  config?: Config;
  className?: string;
}

export default function ChessBoard({ config, className = '' }: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const cgRef = useRef<Api | null>(null);

  useEffect(() => {
    if (boardRef.current && !cgRef.current) {
      cgRef.current = Chessground(boardRef.current, config);
    }
    return () => {
      if (cgRef.current) {
        cgRef.current.destroy();
        cgRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (cgRef.current && config) {
      cgRef.current.set(config);
    }
  }, [config]);

  return (
    <div className={`w-full max-w-[600px] aspect-square ${className}`}>
      <div ref={boardRef} className="w-full h-full" />
    </div>
  );
}

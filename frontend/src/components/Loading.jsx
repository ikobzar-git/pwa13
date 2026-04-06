import { C } from '../theme';

export default function Loading({ text = 'Загрузка...' }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: C.bg,
      color: C.textSec,
      fontSize: 14,
      letterSpacing: '0.05em',
    }}>
      {text}
    </div>
  );
}

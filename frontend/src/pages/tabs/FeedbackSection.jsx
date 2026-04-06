import { useState, useEffect } from 'react';
import { feedback } from '../../api';
import { useApp } from '../../contexts/AppContext';
import { C, btn } from '../../theme';
import { ts } from './tabStyles';

export default function FeedbackSection() {
  const { companyId, showToast } = useApp();
  const [text, setText] = useState('');
  const [topicId, setTopicId] = useState('');
  const [topics, setTopics] = useState([]);
  const [myList, setMyList] = useState([]);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    feedback.topics().then(setTopics).catch(() => setTopics([]));
    feedback.my().then(setMyList).catch(() => setMyList([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await feedback.create(text.trim(), topicId || null, companyId);
      setText('');
      setTopicId('');
      setSent(true);
      showToast('Спасибо за обратную связь');
      feedback.my().then(setMyList);
    } catch (err) {
      showToast(err.message || 'Ошибка', 'error');
    }
  };

  return (
    <>
      <div style={ts.section}>
        <div style={ts.sectionTitle}>Обратная связь</div>
        <form onSubmit={handleSubmit}>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} style={ts.feedbackSelect}>
            <option value="">— Выберите тему —</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setSent(false); }} placeholder="Оставьте отзыв или предложение..." rows={3} style={ts.feedbackTextarea} />
          <button type="submit" style={{ ...btn.primary, marginTop: 10 }}>Отправить</button>
        </form>
        {sent && <p style={{ color: C.gold, marginTop: 10, fontSize: 14 }}>Спасибо за обратную связь</p>}
      </div>
      {myList.length > 0 && (
        <div style={ts.section}>
          <div style={ts.sectionTitle}>Мои обращения</div>
          {myList.map((f) => (
            <div key={f.id} style={ts.feedbackItem}>
              <div style={ts.feedbackMeta}>{new Date(f.created_at).toLocaleString('ru')}{f.topic?.name && <> · <strong style={{ color: C.gold }}>{f.topic.name}</strong></>}</div>
              <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: C.text }}>{f.text}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

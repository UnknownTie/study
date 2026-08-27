import { useState, useEffect } from 'react';

export function useStars() {
  const [stars, setStars] = useState(() => {
    try {
      const saved = localStorage.getItem('starred_questions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('starred_questions', JSON.stringify(stars));
  }, [stars]);

  const toggleStar = (id) => {
    setStars((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const isStarred = (id) => stars.includes(id);

  return { stars, toggleStar, isStarred };
}

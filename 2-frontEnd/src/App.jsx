import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ScrollToTopButton from './components/ScrollToTopButton';
import PasswordGate from './components/PasswordGate';
import { QuizProgressContext } from './lib/quizProgressContext';
import HomePage from './pages/HomePage';
import ExamPage from './pages/ExamPage';
import SubjectPage from './pages/SubjectPage';
import TopicPage from './pages/TopicPage';
import MockExamPage from './pages/MockExamPage';
import RealExamsPage from './pages/RealExamsPage';
import RealExamAnswerSheetPage from './pages/RealExamAnswerSheetPage';

export default function App() {
  // 문제를 푸는 동안의 진행 현황(푼 문제/전체/즐겨찾기) — QuizPanel이 채우고 Header가 상단에 고정 표시한다.
  const [progress, setProgress] = useState(null);

  return (
    <PasswordGate>
      <QuizProgressContext.Provider value={{ progress, setProgress }}>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/exam/:examId/mock" element={<MockExamPage />} />
          <Route path="/exam/:examId/real" element={<RealExamsPage />} />
          <Route path="/exam/:examId/real/:sessionId" element={<RealExamAnswerSheetPage />} />
          <Route path="/exam/:examId/:subjectId/:topicId" element={<TopicPage />} />
          <Route path="/exam/:examId/:subjectId" element={<SubjectPage />} />
          <Route path="/exam/:examId" element={<ExamPage />} />
        </Routes>
        <ScrollToTopButton />
      </QuizProgressContext.Provider>
    </PasswordGate>
  );
}

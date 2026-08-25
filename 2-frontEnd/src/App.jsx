import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ScrollToTopButton from './components/ScrollToTopButton';
import PasswordGate from './components/PasswordGate';
import HomePage from './pages/HomePage';
import ExamPage from './pages/ExamPage';
import SubjectPage from './pages/SubjectPage';
import TopicPage from './pages/TopicPage';
import MockExamPage from './pages/MockExamPage';
import RealExamsPage from './pages/RealExamsPage';
import RealExamAnswerSheetPage from './pages/RealExamAnswerSheetPage';

export default function App() {
  return (
    <PasswordGate>
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
    </PasswordGate>
  );
}

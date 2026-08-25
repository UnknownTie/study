import './Terminal.css';

// example 필드는 지금까지 <span class="prompt/cmd/out/cmt"> 를 섞은 HTML 문자열로 저장돼 있다(직접 작성한 문자열만 사용).
export default function Terminal({ html }) {
  if (!html) return null;
  return <div className="term" dangerouslySetInnerHTML={{ __html: html }} />;
}

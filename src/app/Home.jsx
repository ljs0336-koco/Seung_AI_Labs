import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import geumjjokMain from '../assets/geumjjok/금쪽이_캐릭터_기본_무지개고깔.png';
import speakerThumb from '../assets/geumjjok/스피커 썸네일.png';
import thumbMedia from '../assets/geumjjok/thumb_module2_media.png';
import thumbRole from '../assets/geumjjok/thumb_module3_role.png';
import thumbAgent from '../assets/geumjjok/thumb_module4_agent.png';

const modules = [
  {
    id: '01',
    path: '/fairness',
    title: '공정한 AI 실험실',
    description: '데이터와 기준에 따라 AI 추천이 어떻게 달라지는지 비교하고 공정성을 탐구해요.',
    image: speakerThumb
  },
  {
    id: '02',
    path: '/verification',
    title: '진실·미디어 검증소',
    description: 'AI 답변의 주장과 합성 미디어의 출처·제작 이력·동의 조건을 차례로 검증해요.',
    image: thumbMedia
  },
  {
    id: '03',
    path: '/role',
    title: 'AI에게 무엇을 맡길까?',
    description: '생활 속 부탁을 비교하고, 자동화·AI의 도움·사람의 결정을 구별해요.',
    image: thumbRole
  },
  {
    id: '04',
    path: '/agent',
    title: 'AI가 대신 움직인다면?',
    description: 'AI가 메시지를 보내거나 파일을 바꾸기 전 사람이 확인하고, 이상 행동을 멈춘 뒤 복구하는 방법을 체험해요.',
    image: thumbAgent
  }
];

export default function Home() {
  useEffect(() => {
    document.title = "초등 AI 리터러시 탐험 연구소 · Seung AI Labs";
  }, []);

  return (
    <main className="container home-page">
      <nav style={{ marginBottom: "20px" }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--color-primary, #27675e)",
            textDecoration: "none",
            background: "rgba(255, 255, 255, 0.9)",
            padding: "8px 16px",
            borderRadius: "10px",
            border: "1px solid var(--color-border, #d8d4ca)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
          }}
        >
          <span>←</span>
          <span>통합 포털 메인으로 돌아가기</span>
        </Link>
      </nav>
      <header className="home-hero">
        <img src={geumjjokMain} alt="AI 리터러시 연구원 캐릭터" />
        <div>
          <span className="home-kicker">SEUNG AI LABS · AI LITERACY LAB</span>
          <h1>초등 AI 리터러시 탐험 연구소</h1>
          <p>AI의 작동 원리를 차근차근 살펴보고, 더 나은 질문과 비판적 사고를 훈련하는 네 가지 실습 활동입니다.</p>
        </div>
      </header>

      <section className="home-module-list" aria-label="AI 리터러시 실습 모듈">
        {modules.map(module => (
          <Link key={module.id} to={module.path} className="home-module-link">
            <article className="card interactive-card home-module-card">
              <div className="home-module-media">
                <img src={module.image} alt="" aria-hidden="true" />
              </div>
              <div className="home-module-copy">
                <div className="home-module-meta">
                  <span className="home-module-number">MODULE {module.id}</span>
                  <span className="home-module-status">실습 가능</span>
                </div>
                <h2>{module.id.replace(/^0/, '')}. {module.title}</h2>
                <p>{module.description}</p>
              </div>
              <span className="home-module-action" aria-hidden="true">실습 시작하기 →</span>
            </article>
          </Link>
        ))}
      </section>
    </main>
  );
}

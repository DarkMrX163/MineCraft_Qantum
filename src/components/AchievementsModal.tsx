import React from 'react';
import { Trophy, X, CheckCircle, Award, Sparkles, FlaskConical, Shield, Compass, Swords, Zap } from 'lucide-react';

export interface AchievementItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

export const ALL_ACHIEVEMENTS: AchievementItem[] = [
  { id: 'first_dig', title: 'Первый блок', desc: 'Добудьте или сломайте первый блок в мире', icon: <Compass className="w-5 h-5 text-amber-400" /> },
  { id: 'knight_armor', title: 'Рыцарь в доспехах', desc: 'Скрафтите и экипируйте элементы защиты', icon: <Shield className="w-5 h-5 text-sky-400" /> },
  { id: 'cave_explorer', title: 'Исследователь глубин', desc: 'Спуститесь в подземные пещеры с лавой (Y < 10)', icon: <Compass className="w-5 h-5 text-emerald-400" /> },
  { id: 'monster_hunter', title: 'Охотник на монстров', desc: 'Победите монстра (зомби, скелета, крипера)', icon: <Swords className="w-5 h-5 text-red-400" /> },
  { id: 'meteor_survivor', title: 'Выживший под метеоритами', desc: 'Переживите метеоритный дождь и исследуйте кратер', icon: <Zap className="w-5 h-5 text-orange-400" /> },
  { id: 'potion_master', title: 'Алхимик', desc: 'Выпейте сварированное зелье скорости, ночного зрения или дыхания', icon: <FlaskConical className="w-5 h-5 text-purple-400" /> },
];

interface AchievementsModalProps {
  completedIds: Set<string>;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ completedIds, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black text-amber-400">Достижения и Квесты</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="my-4 bg-stone-950 p-3.5 rounded-2xl border border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-stone-300">Прогресс игрока:</span>
          </div>
          <div className="flex-1 bg-stone-800 rounded-full h-3 overflow-hidden border border-stone-700">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-500"
              style={{ width: `${(completedIds.size / ALL_ACHIEVEMENTS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-black text-amber-400">
            {completedIds.size} / {ALL_ACHIEVEMENTS.length}
          </span>
        </div>

        {/* List of Achievements */}
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {ALL_ACHIEVEMENTS.map((ach) => {
            const isDone = completedIds.has(ach.id);
            return (
              <div
                key={ach.id}
                className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  isDone
                    ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                    : 'bg-stone-950/60 border-stone-800/80 text-stone-400 opacity-70'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${isDone ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-stone-800 border border-stone-700'}`}>
                  {ach.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-black ${isDone ? 'text-amber-300' : 'text-stone-300'}`}>
                    {ach.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-stone-400 leading-tight">
                    {ach.desc}
                  </p>
                </div>

                {isDone ? (
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold shrink-0">
                    <CheckCircle className="w-4 h-4 fill-emerald-400 text-stone-900" />
                    <span>ГОТОВО</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-stone-500 font-bold shrink-0 uppercase tracking-wider">
                    В процессе
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

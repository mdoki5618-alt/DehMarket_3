import React, { useState, useEffect } from 'react';
import { toPersianDigits, toJalali } from '../utils/helpers';

interface AnalogClockProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDigital?: boolean;
}

export default function AnalogClock({ 
  className = '',
}: AnalogClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Persian day of week and month names
  const dayOfWeekNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
  const persianMonthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const dayOfWeek = dayOfWeekNames[time.getDay()];

  // Get full Jalali date components
  const jalaliStr = toJalali(time.toISOString()); // "1405/05/14"
  const parts = jalaliStr.split('/');
  const year = parts[0] ? toPersianDigits(parts[0]) : '';
  const monthIdx = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
  const monthName = persianMonthNames[monthIdx] || '';
  const day = parts[2] ? toPersianDigits(parseInt(parts[2], 10)) : '';

  const formattedFullDate = `${dayOfWeek} ${day} ${monthName} ${year}`;

  return (
    <div className={`flex flex-col items-center justify-center p-2 text-center ${className}`}>
      {/* Date in Pure Black Color */}
      <p className="text-base sm:text-lg font-black text-black tracking-tight mb-2">
        {formattedFullDate}
      </p>

      {/* Digital Clock - 3x Larger Display */}
      <div className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl shadow-md">
        <span className="text-3xl sm:text-4xl font-mono font-black text-emerald-400 dir-ltr tracking-widest">
          {toPersianDigits(
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          )}
        </span>
      </div>
    </div>
  );
}

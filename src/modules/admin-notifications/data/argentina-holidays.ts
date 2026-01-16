export interface Holiday {
  date: string;
  name: string;
  type: 'feriado' | 'puente';
}

export const ARGENTINA_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name: 'Año Nuevo', type: 'feriado' },

  { date: '2026-02-16', name: 'Carnaval', type: 'feriado' },
  { date: '2026-02-17', name: 'Carnaval', type: 'feriado' },

  {
    date: '2026-03-24',
    name: 'Día Nacional de la Memoria por la Verdad y la Justicia',
    type: 'feriado',
  },

  {
    date: '2026-04-02',
    name: 'Día del Veterano y de los Caídos en la Guerra de Malvinas',
    type: 'feriado',
  },
  { date: '2026-04-03', name: 'Viernes Santo', type: 'feriado' },

  { date: '2026-05-01', name: 'Día del Trabajador', type: 'feriado' },
  { date: '2026-05-25', name: 'Día de la Revolución de Mayo', type: 'feriado' },

  {
    date: '2026-06-15',
    name: 'Paso a la Inmortalidad del General Martín Miguel de Güemes',
    type: 'feriado',
  },
  {
    date: '2026-06-20',
    name: 'Paso a la Inmortalidad del General Manuel Belgrano',
    type: 'feriado',
  },

  { date: '2026-07-09', name: 'Día de la Independencia', type: 'feriado' },

  {
    date: '2026-08-17',
    name: 'Paso a la Inmortalidad del General José de San Martín',
    type: 'feriado',
  },

  {
    date: '2026-10-12',
    name: 'Día del Respeto a la Diversidad Cultural',
    type: 'feriado',
  },

  { date: '2026-11-23', name: 'Día de la Soberanía Nacional', type: 'feriado' },

  {
    date: '2026-12-08',
    name: 'Inmaculada Concepción de María',
    type: 'feriado',
  },
  { date: '2026-12-25', name: 'Navidad', type: 'feriado' },
];

export const getHolidayByDate = (date: string): Holiday | undefined => {
  return ARGENTINA_HOLIDAYS_2026.find((holiday) => holiday.date === date);
};

export const getUpcomingHolidays = (daysAhead: number = 30): Holiday[] => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  return ARGENTINA_HOLIDAYS_2026.filter((holiday) => {
    const holidayDate = new Date(holiday.date);
    return holidayDate >= today && holidayDate <= futureDate;
  });
};

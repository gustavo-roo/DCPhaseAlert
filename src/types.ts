export type Status = 'Green - Normal' | 'Yellow - High Volume' | 'Red - Critical';

export interface Community {
  id: string;
  name: string;
  status: Status;
  isUpdated: boolean;
}

export interface PhaseCallLog {
  id: string;
  communityId: string;
  communityName: string;
  status: Status;
  calledBy: string;
  calledById?: string;
  calledAt: string; // ISO string
  timestamp: number; // epoch ms for sorting/cleanup
  dateStr: string; // YYYY-MM-DD in EST
}

export const STATUS_COLORS = {
  'Green - Normal': '#008A00',
  'Yellow - High Volume': '#FFCC00',
  'Red - Critical': '#D2122E',
};

export const COMMUNITIES: string[] = [
  'Associates',
  'Specialists',
  'Travel Trade',
  'Spanish',
  'Portuguese',
  'Latin America (LACD)',
  'WDTC UK',
  'Guest Services',
  'Internet Helpdesk',
  'IHD Spanish',
  'Ticket Helpdesk',
  'Passholder Helpdesk',
  'Messaging',
  'DAS Video Chat',
  'Avengers',
  'PhotoPass (DPI)',
];

export const USER_REGISTRY: Record<string, string> = {
  '01396200': 'Gustavo',
  '00435984': 'Matt',
  '01168272': 'Michelle',
  '00858386': 'Bre',
  '01604775': 'Samantha',
  '00550324': 'Jules',
  '': 'Anderson',
  '00486597': 'Sarah W.',
  '': 'Jess',
  '00989910': 'Sarah S',
  '01633623': 'Drea',
  '01021977': 'Chelsea',
 
  '11223344': 'Disney Admin',
};

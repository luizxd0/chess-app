export interface Bot {
  id: string;
  name: string;
  avatar: string;
  level: number;
  rating: number;
}

export const bots: Bot[] = [
  { id: 'martin', name: 'Martin', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66746160.e1f80ccd.200x200o.b58f17ffc0e0.png', level: 1, rating: 250 },
  { id: 'elani', name: 'Elani', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66746152.b6b27d52.200x200o.d35ddb06eedb.png', level: 2, rating: 400 },
  { id: 'aron', name: 'Aron', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66746132.c9bf01aa.200x200o.f1877d4a07fa.png', level: 3, rating: 700 },
  { id: 'nora', name: 'Nora', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66745978.c271f5d7.200x200o.e48c47b8b341.png', level: 4, rating: 1000 },
  { id: 'fatima', name: 'Fatima', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66745990.88330ef0.200x200o.2d5cd33763ed.png', level: 5, rating: 1200 },
  { id: 'nelson', name: 'Nelson', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/59595542.90aadb5a.200x200o.d5898912ac0e.jpeg', level: 6, rating: 1300 },
  { id: 'antonio', name: 'Antonio', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66746046.ef0d9811.200x200o.6a145d2e7587.png', level: 7, rating: 1500 },
  { id: 'isabel', name: 'Isabel', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66746044.48831c53.200x200o.93fa03150db6.png', level: 8, rating: 1600 },
  { id: 'emir', name: 'Emir', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66746108.2885a6cc.200x200o.5f180578375a.png', level: 9, rating: 1700 },
  { id: 'noam', name: 'Noam', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66745962.8e81d5e6.200x200o.c6b5cb4aa449.png', level: 10, rating: 1800 },
  { id: 'francis', name: 'Francis', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66745948.80bb042b.200x200o.8944afe97e48.png', level: 11, rating: 2000 },
  { id: 'li', name: 'Li', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/66745986.c4b821f2.200x200o.b64d43a160f7.png', level: 12, rating: 2200 },
  { id: 'botez', name: 'Botez', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/86373880.c4aba09c.200x200o.ff0e6e09aa90.png', level: 13, rating: 2300 },
  { id: 'danny', name: 'Danny', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/67841066.d4b2991f.200x200o.a90bd2f04661.png', level: 14, rating: 2400 },
  { id: 'komodo', name: 'Komodo', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/87283122.505c6f0d.200x200o.119e7214316d.png', level: 15, rating: 2500 },
  { id: 'levy', name: 'Levy', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/99160738.7f672194.200x200o.e35333a2433d.png', level: 18, rating: 2700 },
  { id: 'hikaru', name: 'Hikaru', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/67841086.856b74f6.200x200o.4a9adf26fbab.png', level: 19, rating: 2800 },
  { id: 'magnus', name: 'Magnus', avatar: 'https://images.chesscomfiles.com/uploads/v1/user/74638310.31688e02.200x200o.9cb8b482000f.png', level: 20, rating: 2882 },
];

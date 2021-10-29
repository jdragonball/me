const path = require('path');

module.exports = {
  entry: './index.js', // 의존성 그래프의 시작점!! -> 이 파일이 실행된거임. 
  output: {
    filename: 'main.js', // 번들링 결과물로써 dist 파일 내부에 생성되고, index.html에 import 됨.
    path: path.resolve(__dirname, 'dist'),
  },
};

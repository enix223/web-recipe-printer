import { defineApp } from '@umijs/max';
import { App } from 'antd';

export default defineApp({
  layout: () => ({
    menu: { locale: false },
  }),
  rootContainer: (container) => {
    return <App>{container}</App>;
  },
});

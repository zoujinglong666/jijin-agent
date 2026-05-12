import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import Components from '@uni-helper/vite-plugin-uni-components';
import { WotResolver } from './src/resolvers/wot-ui-resolver';

export default defineConfig({
  plugins: [
    Components({
      resolvers: [WotResolver()]
    }),
    uni(),
  ],
});

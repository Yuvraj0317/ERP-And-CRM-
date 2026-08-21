import { app } from './app';
import { ENV } from './config/env';

app.listen(ENV.PORT, () => {
  console.log(`🚀 Mini ERP Backend Server running on http://localhost:${ENV.PORT}`);
});

import { makeCaughtObjectReportJson } from '../src';
import axios from 'axios';

(async () => {
  try {
    await axios.get('https://reqres.in/api/users/23');
  } catch (caught: unknown) {
    const report = makeCaughtObjectReportJson(caught);
    console.log(JSON.stringify(report, null, 2));
  }
})();

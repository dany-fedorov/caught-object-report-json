import { makeCaughtObjectReportJson } from '../src';
import axios from 'axios';

(async () => {
  try {
    await axios.get('https://reqres.in/api/users/23');
  } catch (caught: unknown) {
    console.log(JSON.stringify(makeCaughtObjectReportJson(caught), null, 2));
  }
})();

import { CorjBuilder } from '../src';

describe('CorjBuilder', () => {
  describe('No options', function () {
    const noOptionsBuilder = new CorjBuilder();
    test('Error object', () => {
      const caught = new Error('I am an error!');
      const report = noOptionsBuilder.build(caught);
      expect(typeof report.error_stack).toBe('string');
      delete report.error_stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "https://github.com/dany-fedorov/caught-object-report-json/blob/main/json-schema-v0.1.json",
          "caught_obj_constructor_name": "Error",
          "caught_obj_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": Object {},
          },
          "caught_obj_stringified": "Error: I am an error!",
          "caught_obj_typeof": "object",
          "error_message": "I am an error!",
          "is_error_instance": true,
        }
      `);
    });

    test('String', () => {
      const caught = 'I am a string, but I was thrown nevertheless!';
      const report = noOptionsBuilder.build(caught);
      expect(typeof report.error_stack).toBe('undefined');
      delete report.error_stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "https://github.com/dany-fedorov/caught-object-report-json/blob/main/json-schema-v0.1.json",
          "caught_obj_constructor_name": "String",
          "caught_obj_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": "I am a string, but I was thrown nevertheless!",
          },
          "caught_obj_stringified": "I am a string, but I was thrown nevertheless!",
          "caught_obj_typeof": "string",
          "is_error_instance": false,
        }
      `);
    });
  });
});

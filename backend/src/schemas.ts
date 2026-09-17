export const chatCompletionSchema = {
  type: 'object',
  required: ['model', 'messages'],
  additionalProperties: false,
  properties: {
    model: {
      type: 'string',
      minLength: 1,
    },
    messages: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['role', 'content'],
        additionalProperties: false,
        properties: {
          role: {
            type: 'string',
            enum: ['system', 'user', 'assistant'],
          },
          content: {
            type: 'string',
            minLength: 1,
          },
        },
      },
    },
  },
};

export const deleteModelParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      minLength: 1,
    },
  },
};

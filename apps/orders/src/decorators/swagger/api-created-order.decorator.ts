import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { CreatedOrderDTO, OrderItemDTO } from '../../dto/order.dto';

export const ApiCreatedOrderResponse = (description?: string) => {
  return applyDecorators(
    ApiExtraModels(CreatedOrderDTO, OrderItemDTO),
    ApiOkResponse({
      description: description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(CreatedOrderDTO) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(OrderItemDTO) },
              },
            },
          },
        ],
      },
    }),
  );
};

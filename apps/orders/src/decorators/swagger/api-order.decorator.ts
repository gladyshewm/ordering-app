import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { OrderDTO, OrderItemDTO, StatusHistoryDTO } from '../../dto/order.dto';

export const ApiOrderResponse = (
  description?: string,
  isArray: boolean = false,
) => {
  return applyDecorators(
    ApiExtraModels(OrderDTO, OrderItemDTO, StatusHistoryDTO),
    ApiOkResponse({
      description: description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(OrderDTO) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(OrderItemDTO) },
              },
              statusHistory: {
                type: 'array',
                items: { $ref: getSchemaPath(StatusHistoryDTO) },
              },
            },
          },
        ],
        type: isArray ? 'array' : 'object',
        items: isArray ? { $ref: getSchemaPath(OrderDTO) } : undefined,
      },
    }),
  );
};

import { Injectable } from '@nestjs/common';
import { AbstractRepository } from '@app/common';
import { Product } from './schemas/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, SaveOptions } from 'mongoose';
import { ProductDTO } from './dto/add-product.dto';
import { Reservation } from './schemas/reservation.schema';

@Injectable()
export class ProductRepository extends AbstractRepository<Product> {
  constructor(@InjectModel(Product.name) productModel: Model<Product>) {
    super(productModel);
  }

  async populateReservations(product: Product): Promise<ProductDTO> {
    return this.model
      .findOne(product._id)
      .populate('reservations')
      .lean() as unknown as Promise<ProductDTO>;
  }

  async createAndPopulate(
    document: Partial<Product>,
    options?: SaveOptions,
  ): Promise<ProductDTO> {
    const createdProduct = await super.create(document, options);
    return this.populateReservations(createdProduct);
  }

  async findAndPopulate(
    filterQuery: FilterQuery<Product>,
    projection?: Record<string, unknown>,
  ): Promise<ProductDTO[]> {
    return this.model
      .find(filterQuery, projection)
      .populate<{
        reservations: Reservation;
      }>({ path: 'reservations', model: 'Reservation' })
      .lean() as unknown as Promise<ProductDTO[]>;
  }
}

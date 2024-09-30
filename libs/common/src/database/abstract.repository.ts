import {
  Connection,
  FilterQuery,
  Model,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose';
import { AbstractDocument } from './abstract.schema';
import { NotFoundException } from '@nestjs/common';

export abstract class AbstractRepository<TDocument extends AbstractDocument> {
  constructor(
    protected readonly model: Model<TDocument>,
    private readonly connection: Connection,
  ) {}

  async create(
    document: Partial<TDocument>,
    options?: SaveOptions,
  ): Promise<TDocument> {
    const createdDocument = new this.model({
      ...document,
      _id: new Types.ObjectId(),
    });
    return createdDocument.save(options);
  }

  async findOne(
    filterQuery: FilterQuery<TDocument>,
    projection?: Record<string, unknown>,
  ): Promise<TDocument> {
    const document = await this.model.findOne(filterQuery, projection);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async find(
    filterQuery: FilterQuery<TDocument>,
    projection?: Record<string, unknown>,
  ): Promise<TDocument[]> {
    return this.model.find(filterQuery, projection);
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<unknown>,
  ): Promise<TDocument> {
    const document = this.model.findOneAndUpdate(filterQuery, update, {
      new: true,
    });

    if (!document) {
      throw new NotFoundException(
        `Document not found for filterQuery ${filterQuery}`,
      );
    }

    return document;
  }

  async upsert(
    filterQuery: FilterQuery<TDocument>,
    document: Partial<TDocument>,
  ) {
    return this.model.findOneAndUpdate(filterQuery, document, {
      lean: true,
      upsert: true,
      new: true,
    });
  }

  async startTransaction() {
    const session = await this.connection.startSession();
    session.startTransaction();
    return session;
  }
}

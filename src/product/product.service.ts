import { 
	Injectable, 
	NotFoundException, 
	BadRequestException,
	NotImplementedException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { IProduct } from './interface/product.interface';
import { CreateProductDTO, UpdateProductDTO } from './dto/product.dto';
import { TopicService } from '../topic/topic.service';
import { Query } from '../utils/OptQuery';
import { ReverseString } from '../utils/StringManipulation';
import { TimeValidation } from '../utils/CustomValidation';

@Injectable()
export class ProductService {

	constructor(
		@InjectModel('Product') private readonly productModel: Model<IProduct>,
		private readonly topicService: TopicService
	) {}

	async create(createProductDto: CreateProductDTO): Promise<IProduct> {
		const product = new this.productModel(createProductDto)

		const { name, slug, start_time, end_time } = product
		
		console.log('start_time', start_time)
		// Make Product Slug
		const makeSlug = slug.replace(' ', '-')
				
		// Check if product name is already exist
		const isProductSlugExist = await this.productModel.findOne({ slug: makeSlug })
        	
		if (isProductSlugExist) {
        	throw new BadRequestException('That product slug is already exist.')
		}
		
		product.slug = makeSlug

		var arrayTopic = createProductDto.topic

		for (let i = 0; i < arrayTopic.length; i++) {
			const isTopicExist = await this.topicService.findById(arrayTopic[i])
			if (! isTopicExist) {
				throw new BadRequestException()
			}
		}
		
		// create Product Code
		var makeCode = ReverseString(name) // to convert Product Code

		product.code = makeCode

		if(start_time){

			const checkStartTime = TimeValidation(start_time)
			const checkEndTime = TimeValidation(end_time)

			if(!checkStartTime) {
				throw new BadRequestException('Start time field not valid, ex: 09:59')
			}

			if(!checkEndTime){
				throw new BadRequestException('End time field not valid, ex: 10:59')
			}
		}

		return await product.save()
	}

	async findAll(options: Query): Promise<IProduct[]> {
		const offset = (options.offset == 0 ? options.offset : (options.offset - 1))
		const skip = offset * options.limit
		const sortval = (options.sortval == 'asc') ? 1 : -1

		if (options.sortby){
			if (options.fields) {

				return await this.productModel
					.find({ $where: `/^${options.value}.*/.test(this.${options.fields})` })
					.skip(Number(skip))
					.limit(Number(options.limit))
					.sort({ [options.sortby]: sortval })
					.populate('topic')

			} else {

				return await this.productModel
					.find()
					.skip(Number(skip))
					.limit(Number(options.limit))
					.sort({ [options.sortby]: sortval })
					.populate('topic')

			}
		}else{
			if (options.fields) {

				return await this.productModel
					.find({ $where: `/^${options.value}.*/.test(this.${options.fields})` })
					.skip(Number(skip))
					.limit(Number(options.limit))
					.populate('topic')

			} else {

				return await this.productModel
					.find()
					.skip(Number(skip))
					.limit(Number(options.limit))
					.populate('topic')
			}
		}
	}

	async findById(id: string): Promise<IProduct> {
	 	let result
		try{
			result = await this.productModel.findById(id).populate('topic')
		}catch(error){
		    throw new NotFoundException(`Could nod find product with id ${id}`)
		}

		if(!result){
			throw new NotFoundException(`Could nod find product with id ${id}`)
		}

		return result
	}

	async findOne(options: object): Promise<IProduct> {
		const product = await this.productModel.findOne(options).populate('topic')

		if(!product){
			throw new NotFoundException(`Could nod find product with your condition`)
		}

		return product
	}

	async update(id: string, updateProductDto: UpdateProductDTO): Promise<IProduct> {
		let result;
		
		// Check ID
		try{
			result = await this.productModel.findById(id).exec()
		}catch(error){
		    throw new NotFoundException(`Could nod find product with id ${id}`);
		}

	 	if(!result){
	 		throw new NotFoundException(`Could nod find product with id ${id}`);
	 	}

		await this.productModel.findByIdAndUpdate(id, updateProductDto);
		return await this.productModel.findById(id).populate('topic')
	}

	async delete(id: string): Promise<string> {
		try{
			await this.productModel.findByIdAndRemove(id).exec();
			return 'ok'
		}catch(err){
			throw new NotImplementedException('The product could not be deleted')
		}
	}
}

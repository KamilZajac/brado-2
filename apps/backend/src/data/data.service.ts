import { Injectable } from '@nestjs/common';
import {DataReading} from "@brado/shared-models";


@Injectable()
export class DataService {
  create(createDatumDto: DataReading[]) {
    console.log('RECEIVED DATA!')
    console.log(createDatumDto);
    return 'This action adds a new datum';
  }

  findAll() {
    return `This action returns all data`;
  }

  findOne(id: number) {
    return `This action returns a #${id} datum`;
  }

  update(id: number, updateDatumDto: DataReading) {
    return `This action updates a #${id} datum`;
  }

  remove(id: number) {
    return `This action removes a #${id} datum`;
  }
}

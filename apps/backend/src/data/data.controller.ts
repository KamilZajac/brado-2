import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';
import {DataService} from './data.service';
import {LiveReading} from "@brado/types";

@Controller('data')
export class DataController {
    constructor(private readonly dataService: DataService) {
    }

    @Post()
    create(@Body() data: LiveReading[]) {
        return this.dataService.create(data);
    }

    @Get()
    findAll() {
        return this.dataService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.dataService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDatumDto: any) {
        return this.dataService.update(+id, updateDatumDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.dataService.remove(+id);
    }
}

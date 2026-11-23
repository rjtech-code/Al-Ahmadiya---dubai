import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { MediaController } from './media.controller';

@Module({ controllers: [MediaController, FilesController] })
export class MediaModule {}

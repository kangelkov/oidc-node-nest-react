import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TodosService } from './todos.service.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ConfigService } from '@nestjs/config';

@ApiTags('todos')
@ApiBearerAuth()
@Controller('todos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TodosController {
    private enforceOwnership: boolean;
    constructor(private readonly svc: TodosService, cfg: ConfigService) {
        this.enforceOwnership = (cfg.get<string>('ENFORCE_OWNERSHIP') ?? 'false').toLowerCase() === 'true';
    }

    @Get()
    @Roles('read')
    async list() {
        return await this.svc.list();
    }

    @Post()
    @Roles('write')
    async create(@Body() dto: CreateTodoDto, @Req() req: any) {
        const ownerId: string | undefined = req.user?.sub;
        const created = await this.svc.create(dto, ownerId);
        return created;
    }

    @Patch(':id')
    @Roles('write')
    async update(@Param('id') id: string, @Body() dto: UpdateTodoDto, @Req() req: any) {
        if (this.enforceOwnership) {
            const list = await this.svc.list();
            const t = list.find(x => x.id === id);
            if (!t) throw new ForbiddenException('not_found');
            const roles: string[] = req.userRoles ?? [];
            const isAdmin = roles.includes('admin');
            if (!isAdmin && t.ownerId && t.ownerId !== req.user?.sub) {
                throw new ForbiddenException('not_owner');
            }
        }
        return await this.svc.update(id, dto);
    }

    @Delete(':id')
    @Roles('write')
    async remove(@Param('id') id: string, @Req() req: any) {
        if (this.enforceOwnership) {
            const list = await this.svc.list();
            const t = list.find(x => x.id === id);
            if (!t) throw new ForbiddenException('not_found');
            const roles: string[] = req.userRoles ?? [];
            const isAdmin = roles.includes('admin');
            if (!isAdmin && t.ownerId && t.ownerId !== req.user?.sub) {
                throw new ForbiddenException('not_owner');
            }
        }
        await this.svc.remove(id);
        return { success: true };
    }
}

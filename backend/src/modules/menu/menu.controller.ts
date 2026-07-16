import { Controller, Get } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get('my-menu')
  findMyMenu(@CurrentUser() user: any) {
    return this.menuService.getMenuForUser(user.permissions || []);
  }
}

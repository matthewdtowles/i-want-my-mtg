import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Redirect,
  Render,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { UpdateUserDto } from "src/core/user/dto/update-user.dto";
import { UserDto } from "src/core/user/dto/user.dto";
import { UserServicePort } from "src/core/user/ports/user.service.port";
import { CreateUserDto } from "../../core/user/dto/create-user.dto";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";
import { AuthenticatedRequest } from "./auth/authenticated.request";

@Controller("user")
export class UserController {
  constructor(
    @Inject(UserServicePort) private readonly userService: UserServicePort,
  ) { }

  @Get("create")
  @Render("create-user")
  createForm() {
    return {};
  }

  @Post("create")
  @Redirect()
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const createdUser: UserDto = await this.userService.create(createUserDto);
      if (!createdUser) {
        throw new Error(`Could not create user`);
      }
      return {
        message: `Account created for ${createdUser.name}`,
        url: `/user/${createdUser.id}`,
      };
    } catch (error) {
      return {
        message: `${error.message}`,
        url: `/user/create`,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @Render("user")
  async findById(req: AuthenticatedRequest) {
    const id: number = req.user.id;
    const foundUser: UserDto = await this.userService.findById(id);
    const login: boolean =
      foundUser &&
      req.query &&
      req.query.status === HttpStatus.OK.toString() &&
      req.query.action === "login";
    return {
      message: login ? `${foundUser.name} - logged in` : null,
      user: await this.userService.findById(id),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(@Body() updateUserDto: UpdateUserDto, @Res() res: Response) {
    try {
      const updatedUser: UserDto = await this.userService.update(updateUserDto);
      return res.status(HttpStatus.OK).json({
        message: `User ${updatedUser.name} updated successfully`,
        user: updatedUser,
      });
    } catch (error) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: `Error updating user: ${error.message}` });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async remove(
    @Res() res: Response,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const id: number = req.user.id;
      if (!req.user) {
        throw new Error("Unauthorized to delete user");
      }
      await this.userService.remove(id);
      const user: UserDto = await this.userService.findById(id);
      if (user && user.name) {
        throw new Error("Could not delete user");
      }
      return res
        .status(HttpStatus.OK)
        .json({ message: "User deleted successfully" });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  }
}

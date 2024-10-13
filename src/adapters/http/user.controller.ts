import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Redirect,
  Render,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { UpdateUserDto } from "src/core/user/dto/update-user.dto";
import { UserDto } from "src/core/user/dto/user.dto";
import { UserServicePort } from "src/core/user/ports/user.service.port";
import { CreateUserDto } from "../../core/user/dto/create-user.dto";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";

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
  @Get(":id")
  @Render("user")
  async findById(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
    const foundUser: UserDto = await this.userService.findById(id);
    const login: boolean =
      foundUser &&
      req.query &&
      req.query.status === "200" &&
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
  @Delete(":id")
  async remove(@Param("id") id: number, @Res() res: Response) {
    try {
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

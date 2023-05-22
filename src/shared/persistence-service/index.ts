export abstract class PrismaBasedPersistenceService<
  PrismaClientType,
  PrismaModelDelegate,
  EntityDto,
  CreateEntityInputDto,
  UpdateEntityInputDto
> {
  protected abstract entityTypeName: string;
  protected abstract modelAccessor: PrismaModelDelegate & {
    create: any;
    findMany: any;
    findUnique: any;
    update: any;
    delete: any;
  };
  protected abstract isPrimaryKeyComposite: boolean;

  abstract prismaClient: PrismaClientType;

  protected async createEntity(
    createEntityInputDto: CreateEntityInputDto
  ): Promise<EntityDto | null> {
    let newEntityDto: EntityDto | null = null;

    try {
      newEntityDto = await this.modelAccessor.create({
        data: {
          // TODO: TRIP, VERIFY STRING FORMAT
          ...createEntityInputDto,
        },
      });
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: `Couldn't create a ${this.entityTypeName} record!`,
          error,
          createEntityInputDto,
        })
      );
      return null;
    }

    return newEntityDto;
  }

  protected async getAllEntities(): Promise<EntityDto[]> {
    try {
      return await this.modelAccessor.findMany();
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: `Couldn't fetch ${this.entityTypeName} records!`,
          error,
        })
      );
    }

    return [];
  }

  protected async getUniqueEntity(
    primaryKeyFieldName: string,
    primaryKeyValue: string | { [key: string]: any }
  ): Promise<EntityDto | null> {
    if (this.isPrimaryKeyComposite && typeof primaryKeyValue === "string") {
      console.warn(
        JSON.stringify({
          message: `Wrong type of primary key provided! Cannot query ${this.entityTypeName} record!`,
          expectedTypeOfPrimaryKey: this.isPrimaryKeyComposite
            ? "COMPOSITE"
            : "STRING",
          attemptedPrimaryKey: primaryKeyValue,
        })
      );
    }

    let entityDto: EntityDto | null = null;

    try {
      entityDto = await this.modelAccessor.findUnique({
        where: {
          [primaryKeyFieldName]: primaryKeyValue,
        },
      });
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: `Couldn't fetch ${this.entityTypeName} record!`,
          primaryKey: { [primaryKeyFieldName]: primaryKeyValue },
          error,
        })
      );
      return null;
    }

    if (!entityDto) {
      console.log(
        JSON.stringify({
          message: `${this.entityTypeName} record does not exist!`,
          primaryKey: { [primaryKeyFieldName]: primaryKeyValue },
        })
      );
      return null;
    }

    return entityDto;
  }

  protected async searchEntities(searchParams: {
    [key: string]: any;
  }): Promise<EntityDto[]> {
    try {
      return await this.modelAccessor.findMany({
        where: {
          ...searchParams,
        },
      });
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: `Couldn't fetch ${this.entityTypeName} records!`,
          searchParams,
          error,
        })
      );
    }

    return [];
  }

  protected async updateEntity(
    primaryKeyFieldName: string,
    primaryKeyValue: string | { [key: string]: any },
    updateEntityInputDto: UpdateEntityInputDto
  ): Promise<EntityDto | null> {
    // Removing possible undefined values from update input
    const validatedUpdateInput = Object.entries(
      updateEntityInputDto as { [key: string]: any }
    ).reduce((filtered, [key, value]) => {
      if (value !== undefined) {
        return {
          ...filtered,
          [key]: value,
        };
      }
      return filtered;
    }, {});

    let updatedEntityDto: EntityDto | null = null;

    if (this.isPrimaryKeyComposite && typeof primaryKeyValue === "string") {
      console.warn(
        JSON.stringify({
          message: `Wrong type of primary key provided! Aborting ${this.entityTypeName} update!`,
          expectedTypeOfPrimaryKey: this.isPrimaryKeyComposite
            ? "COMPOSITE"
            : "STRING",
          attemptedPrimaryKey: primaryKeyValue,
        })
      );
    }

    try {
      updatedEntityDto = await this.modelAccessor.update({
        where: {
          [primaryKeyFieldName]: primaryKeyValue,
        },
        data: validatedUpdateInput,
      });
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: `Couldn't perform update operation for this ${this.entityTypeName} record!`,
          primaryKey: { [primaryKeyFieldName]: primaryKeyValue },
          error,
          validatedUpdateInput,
        })
      );
      return null;
    }

    return updatedEntityDto;
  }

  /**
   * @deprecated Instead of hard deleting records, deactivate them by setting 'isActive' flag to false if possible.
   */
  protected async deleteEntity(
    primaryKeyFieldName: string,
    primaryKeyValue: string | { [key: string]: any }
  ): Promise<EntityDto | null> {
    console.warn(
      JSON.stringify({
        message: `Forcefully deleting ${this.entityTypeName} record. Please consider deactivating users (soft-delete) next time instead of losing data :)`,
        primaryKey: { [primaryKeyFieldName]: primaryKeyValue },
      })
    );

    if (this.isPrimaryKeyComposite && typeof primaryKeyValue === "string") {
      console.warn(
        JSON.stringify({
          message: `Wrong type of primary key provided! Aborting ${this.entityTypeName} update!`,
          expectedTypeOfPrimaryKey: this.isPrimaryKeyComposite
            ? "COMPOSITE"
            : "STRING",
          attemptedPrimaryKey: primaryKeyValue,
        })
      );
    }

    let deletedUserDto: EntityDto | null = null;

    try {
      deletedUserDto = await this.modelAccessor.delete({
        where: {
          [primaryKeyFieldName]: primaryKeyValue,
        },
      });
    } catch (error) {
      console.warn(
        JSON.stringify({
          message: `Couldn't hard delete this ${this.entityTypeName} record!`,
          primaryKey: { [primaryKeyFieldName]: primaryKeyValue },
          error,
        })
      );
      return null;
    }

    return deletedUserDto;
  }
}

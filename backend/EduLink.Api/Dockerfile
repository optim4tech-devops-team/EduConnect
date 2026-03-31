FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY EduLink.sln .
COPY EduLink.Domain/EduLink.Domain.csproj EduLink.Domain/
COPY EduLink.Infrastructure/EduLink.Infrastructure.csproj EduLink.Infrastructure/
COPY EduLink.Application/EduLink.Application.csproj EduLink.Application/
COPY EduLink.Api/EduLink.Api.csproj EduLink.Api/

RUN dotnet restore EduLink.Api/EduLink.Api.csproj

COPY . .

RUN dotnet publish EduLink.Api/EduLink.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENTRYPOINT ["dotnet", "EduLink.Api.dll"]

import { resolve } from 'path';

import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

import { Schema as AddNsOptions } from './schema';
import { getFileContent } from '@schematics/angular/utility/test';

describe('Add {N} schematic', () => {
    const schematicRunner = new SchematicTestRunner(
        'nativescript-schematics',
        resolve(__dirname, '../collection.json'),
    );
    const project = 'foo';
    const defaultOptions: AddNsOptions = {
        project,
        nsExtension: 'tns',
        webExtension: '',
        sample: false,
        skipAutoGeneratedComponent: false,
    };

    let appTree: UnitTestTree;

    beforeEach(async () => {
        appTree = new UnitTestTree(new HostTree());
        appTree = await setupProject(appTree, schematicRunner, project);
    });

    describe('when using the default options', () => {
        beforeEach(async () => {
            appTree = await schematicRunner.runSchematicAsync('add-ns', defaultOptions, appTree)
                .toPromise();
        });

        it('should add dependency to NativeScript schematics', () => {
            const configFile = '/angular.json';
            expect(appTree.files).toContain(configFile);
            const configFileContent = JSON.parse(getFileContent(appTree, configFile));

            expect(configFileContent.cli.defaultCollection).toEqual('@nativescript/schematics');
        });

        it('should add {N} specific files', () => {
            const files = appTree.files;

            expect(files).toContain('/nsconfig.json');
            expect(files).toContain('/tsconfig.tns.json');
            expect(files).toContain('/src/app.css');
            expect(files).toContain('/src/main.tns.ts');
            expect(files).toContain('/src/package.json');
            expect(files).toContain('/src/app/app.module.tns.ts');
            expect(files).toContain('/src/app/app.component.tns.ts');
            expect(files).toContain('/src/app/app.component.tns.html');
        });

        it('should add native app resources', () => {
            expect(appTree.files).toContain('/App_Resources/Android/app.gradle');
            expect(appTree.files).toContain('/App_Resources/iOS/Info.plist');
        });

        it('should add {N} specifics to gitignore', () => {
            const gitignorePath = '/.gitignore';
            expect(appTree.files).toContain(gitignorePath);
            const gitignore = getFileContent(appTree, gitignorePath);

            expect(gitignore.includes('node_modules/')).toBeTruthy();
            expect(gitignore.includes('platforms/')).toBeTruthy();
            expect(gitignore.includes('hooks/')).toBeTruthy();
            expect(gitignore.includes('src/**/*.js')).toBeTruthy();
        });

        it('should add all required dependencies to the package.json', () => {
            const packageJsonPath = '/package.json';
            expect(appTree.files).toContain(packageJsonPath);

            const packageJson = JSON.parse(getFileContent(appTree, packageJsonPath));
            const { dependencies, devDependencies } = packageJson;
            expect(dependencies).toBeDefined();
            expect(dependencies['nativescript-angular']).toBeDefined();
            expect(dependencies['nativescript-theme-core']).toBeDefined();
            expect(dependencies['tns-core-modules']).toBeDefined();
            expect(dependencies['reflect-metadata']).toBeDefined();

            expect(devDependencies['nativescript-dev-webpack']).toBeDefined();
            expect(devDependencies['@nativescript/schematics']).toBeDefined();
        });

        it('should add run scripts to the package json', () => {
            const packageJsonPath = '/package.json';
            expect(appTree.files).toContain(packageJsonPath);

            const packageJson = JSON.parse(getFileContent(appTree, packageJsonPath));
            const { scripts } = packageJson;
            expect(scripts).toBeDefined();
            expect(scripts.android).toEqual('tns run android');
            expect(scripts.ios).toEqual('tns run ios');
        });

        it('should add NativeScript key to the package json', () => {
            const packageJsonPath = '/package.json';
            expect(appTree.files).toContain(packageJsonPath);

            const packageJson = JSON.parse(getFileContent(appTree, packageJsonPath));
            const { nativescript } = packageJson;

            expect(nativescript).toBeDefined();
            expect(nativescript.id).toEqual('org.nativescript.ngsample');
        });

        it('should modify the tsconfig.app.json (web) to include files and path mappings', () => {
            const webTsConfigPath = '/tsconfig.app.json';
            expect(appTree.files).toContain(webTsConfigPath);

            const webTsconfig = JSON.parse(getFileContent(appTree, webTsConfigPath));
            const files = webTsconfig.files;

            expect(files).toBeDefined();
            expect(files.includes('src/main.ts')).toBeTruthy();
            expect(files.includes('src/polyfills.ts')).toBeTruthy();

            const paths = webTsconfig.compilerOptions.paths;
            expect(paths).toBeDefined();
            expect(paths['@src/*']).toBeDefined();

            const maps = paths['@src/*'];
            expect(maps).toContain('src/*.web');
            expect(maps).toContain('src/*');
        });

        it('should create the tsconfig.tns.json with files and path mappings', () => {
            const nsTsConfigPath = '/tsconfig.tns.json';
            expect(appTree.files).toContain(nsTsConfigPath);

            const nsTsConfig = JSON.parse(getFileContent(appTree, nsTsConfigPath));
            const files = nsTsConfig.files;

            expect(files).toBeDefined();
            expect(files).toContain('src/main.tns.ts');

            const paths = nsTsConfig.compilerOptions.paths;
            expect(paths).toBeDefined();
            expect(paths['@src/*']).toBeDefined();

            const maps = paths['@src/*'];
            expect(maps).toContain('src/*.ios.ts');
            expect(maps).toContain('src/*.android.ts');
            expect(maps).toContain('src/*.tns.ts');
            expect(maps).toContain('src/*.ts');
        });

        it('should modify the base tsconfig.json to include path mappings', () => {
            const baseTsConfigPath = '/tsconfig.json';
            expect(appTree.files).toContain(baseTsConfigPath);

            const baseTsConfig = JSON.parse(getFileContent(appTree, baseTsConfigPath));

            const paths = baseTsConfig.compilerOptions.paths;
            expect(paths).toBeDefined();
            expect(paths['@src/*']).toBeDefined();

            const maps = paths['@src/*'];
            expect(maps).toContain('src/*.android.ts');
            expect(maps).toContain('src/*.ios.ts');
            expect(maps).toContain('src/*.tns.ts');
            expect(maps).toContain('src/*.web.ts');
            expect(maps).toContain('src/*');
        });

        it('should generate a sample shared component', () => {
            const { files } = appTree;
            const appRoutingModuleContent = appTree.readContent('/src/app/app-routing.module.tns.ts');
            const appComponentTemplate = appTree.readContent('/src/app/app.component.tns.html');
            expect(files).toContain('/src/app/auto-generated/auto-generated.component.ts');
            expect(files).toContain('/src/app/auto-generated/auto-generated.component.html');
            expect(files).toContain('/src/app/auto-generated/auto-generated.component.tns.html');
            expect(appRoutingModuleContent).toMatch(
                /import { AutoGeneratedComponent } from '@src\/app\/auto-generated\/auto-generated.component'/,
            );
            expect(appRoutingModuleContent).toMatch(
                /{\s+path: 'auto-generated',\s+component: AutoGeneratedComponent,\s+},/g,
            );
            expect(appComponentTemplate).not.toContain(
                '<Label text="Entry Component works" textWrap="true"></Label>',
            );
        });
    });

    describe('when the skipAutoGeneratedComponent flag is raised', () => {
        beforeEach(async () => {
            const options = {
                ...defaultOptions,
                skipAutoGeneratedComponent: true,
            };

            appTree = await schematicRunner.runSchematicAsync('add-ns', options, appTree).toPromise();
        });

        it('should not add a sample shared component', () => {
            const { files } = appTree;
            const appRoutingModuleContent = appTree.readContent('/src/app/app-routing.module.tns.ts');
            const appComponentTemplate = appTree.readContent('/src/app/app.component.tns.html');
            expect(files).not.toContain('/src/app/auto-generated/auto-generated.component.css');
            expect(files).not.toContain('/src/app/auto-generated/auto-generated.component.html');
            expect(files).not.toContain('/src/app/auto-generated/auto-generated.component.ts');
            expect(appRoutingModuleContent).not.toMatch(
                /import { AutoGeneratedComponent } from '.\/auto-generated\/auto-generated.component'/,
            );
            expect(appRoutingModuleContent).toContain(
                'export const routes: Routes = []',
            );
            expect(appComponentTemplate).toContain(
                '<Label text="Entry Component works" textWrap="true"></Label>',
            );
        });
    });

    describe('when the sample flag is raised', () => {
        beforeEach(async () => {
            const options = {
                ...defaultOptions,
                sample: true,
            };

            appTree = await schematicRunner.runSchematicAsync('add-ns', options, appTree).toPromise();
        });

        it('should generate sample files', () => {
            const { files } = appTree;

            expect(files).toContain('/src/app/barcelona/barcelona.common.ts');
            expect(files).toContain('/src/app/barcelona/barcelona.module.ts');
            expect(files).toContain('/src/app/barcelona/barcelona.module.tns.ts');
            expect(files).toContain('/src/app/barcelona/player.service.ts');
            expect(files).toContain('/src/app/barcelona/player.model.ts');

            expect(files).toContain('/src/app/barcelona/players/players.component.ts');
            expect(files).toContain('/src/app/barcelona/players/players.component.html');
            expect(files).toContain('/src/app/barcelona/players/players.component.tns.html');

            expect(files).toContain('/src/app/barcelona/player-detail/player-detail.component.ts');
            expect(files).toContain('/src/app/barcelona/player-detail/player-detail.component.html');
            expect(files).toContain('/src/app/barcelona/player-detail/player-detail.component.tns.html');
        });

        it('should configure routing for redirection', () => {
            const appRoutingModuleContent = appTree.readContent('/src/app/app-routing.module.tns.ts');
            expect(appRoutingModuleContent).toMatch(
                /{\s+path: '',\s+redirectTo: '\/players',\s+pathMatch: 'full',\s+},/g,
            );
        });
    });
});

async function setupProject(
    tree: UnitTestTree,
    schematicRunner: SchematicTestRunner,
    name: string,
) {

    tree = await schematicRunner.runExternalSchematicAsync(
        '@schematics/angular',
        'workspace',
        {
            name: 'workspace',
            version: '8.0.0',
            newProjectRoot: '',
        },
    ).toPromise();

    tree = await schematicRunner.runExternalSchematicAsync(
        '@schematics/angular',
        'application',
        {
            name,
            projectRoot: '',
        },
        tree,
    ).toPromise();

    return tree;
}

//@ts-check
import { Command } from "commander";
import * as fs from "../fs_helpers.js";
import * as Helios from "@hyperionbt/helios";

/**
 * @typedef {Object.<string, string>} TemplateParams
 */


/**
 * 
 * @param {string} src_path 
 * @param {string | undefined} params_path 
 * @param {boolean} verbose 
 * @param {string | undefined} output_path 
 * @returns 
 */
function compile_action(src_path, params_path, verbose, output_path,) {
    console.log(`🔨 Compiling '${fs.parse_file_path(src_path).base}'`)

    // Get the source_file as a string
    /** @type {string} */
    let src = fs.read_file(src_path)

    // TODO Refactor
    /** @type {fs.Path} */
    let output_file_path = fs.parse_file_path(src_path);
    if (output_path) {
        output_file_path = fs.parse_file_path(output_path);
    }

    // Change the output file's extension to JSON and format it into a string.
    /** @type {string} */
    let output_file_path_str = fs.format_file_path(output_file_path);
    output_file_path_str = output_file_path_str.split(".")[0] + ".json"


    // Get the contract params
    /**
     * @type {TemplateParams} 
     */
    let params = {};
    if (params_path) {
        params = JSON.parse(fs.read_file(params_path));
    }

    // Compile the user program
    /** @type {string} */
    let comp_result = "";
    try {
        let program = Helios.Program.new(src);
        
        // Set all params in Programs
        for (const [key, value] of Object.entries(params)) {
            program.changeParam(key, value)
        }

        comp_result = program.compile(true).serialize();

        // If verbose is turned on print the contract's address.
        if (verbose) {
            console.log(`📍 '${program.name}' Address: ${JSON.parse(comp_result).cborHex}`);
        }
    } catch (err) {
        if (err instanceof Helios.UserError) {
            console.log(`❌ ${err}`);
            return
        } else {
            throw err;
        }
    }


    fs.write_to_file(output_file_path_str, comp_result)
    // console.log(`Written to ${output_file_path_str}`)
}


// TODO hyperion compile <file_name> --params <param_file>
// TODO hyperion compile <file_name> --out_file <out_file>
// TODO hyperion compile --directory <dir-name>        // Compiles all helios files in the directory and writes then
// TODO hyperion compile                   
const compile_cmd = new Command("compile")
    .description("Compiles a Helios or Helios Data file to JSON.")
    .option("-i, input_file", "Path to the source file.")
    .option("-v, --verbose", "Turn on verbose mode.")
    .option("-o, --output_file <path>", "Add custom output file.")
    .option("-p, --params <param_path>", "Prints the result of the compilation")
    .option("-d, --directory <dir_name>",)
    .action((options) => {
        let verbose = options.verbose;

        if (options.input_file) {
            let src_path = options.input_file

            let output_file_path = fs.parse_file_path(src_path);
            if (options.output_file) {
                output_file_path = fs.parse_file_path(options.output_file);
            }

            // Change the output file's extension to JSON and format it into a string.
            /** @type {string} */
            let output_file_path_str = fs.format_file_path(output_file_path);
            output_file_path_str = output_file_path_str.split(".")[0] + ".json"

            compile_action(src_path, options.params, verbose, options.output_file)
        } else if (options.directory) {
            // TODO Add custom notification
            console.log(`🤖 Compiling files in '${options.directory}'`);
            let files = fs.get_files_in_dir(options.directory, ".hl")

            files.forEach((src_path) => {
                compile_action(src_path, undefined, verbose, undefined)
            })
        } else {

            let { srcDir, buildDir, paramsDir } = fs.get_config();
            let file_names = fs.get_file_names_in_dir(srcDir, ".hl")

            // Make build directory if it doesn't exist.
            if (!fs.exists(buildDir)) {
                console.log(`Creating ${buildDir} to store builds.`)
                fs.mkdir(buildDir);
            }

            console.log(`🤖 Compiling all files in '${srcDir}'.`);
            file_names.forEach((file_name) => {
                const format_dir = (dir, ext) => { return dir + (dir.endsWith("/") ? "" : "/") + file_name + ext };

                let src_path = format_dir(srcDir, ".hl");

                let params_path_ = format_dir(paramsDir, ".params.json");
                let params_path = fs.exists(params_path_) ? params_path_ : undefined;

                let output_path = format_dir(buildDir, ".json");

                compile_action(src_path, params_path, verbose, output_path)
            })
        }

        console.log(`✅ Done`)
    })
export { compile_cmd }
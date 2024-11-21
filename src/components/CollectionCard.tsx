import { useState } from "react";
import type { BeatCollection } from "../bindings";

interface EditSetCardProps {
    set?: SetFormState;
    onClose: () => void;
    onSave: (setData: Partial<BeatCollection>) => void;
    isCreating?: boolean;
}

interface SetFormState {
    id?: number;
    set_name?: string;
    venue?: string;
    city?: string;
    state_name?: string;
    date_played?: string;
    date_created?: string;
}

interface FormErrors {
    set_name?: string;
    date_played?: string;
    date_created?: string;
}

const EditSetCard: React.FC<EditSetCardProps> = ({ set, onClose, onSave, isCreating = false }) => {
    const [editedSet, setEditedSet] = useState<SetFormState>({
        set_name: set?.set_name || "",
        venue: set?.venue || "",
        city: set?.city || "",
        state_name: set?.state_name || "",
        date_played: set?.date_played || "",
        date_created: set?.date_created || new Date().toISOString().split('T')[0],
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const validateField = (name: string, value: string): string | undefined => {
        switch (name) {
            case 'set_name':
                if (!value.trim()) {
                    return 'Set name is required';
                }
                break;
            case 'date_played':
            case 'date_created':
                if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    return 'Please enter a valid date (YYYY-MM-DD)';
                }
                break;
        }
        return undefined;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // Validate the field
        const error = validateField(name, value);
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));

        setEditedSet(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields before submission
        const newErrors: FormErrors = {};
        if (!editedSet.set_name.trim()) {
            newErrors.set_name = 'Set name is required';
        }
        if (editedSet.date_played && !/^\d{4}-\d{2}-\d{2}$/.test(editedSet.date_played)) {
            newErrors.date_played = 'Please enter a valid date (YYYY-MM-DD)';
        }
        if (editedSet.date_created && !/^\d{4}-\d{2}-\d{2}$/.test(editedSet.date_created)) {
            newErrors.date_created = 'Please enter a valid date (YYYY-MM-DD)';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Prepare submission data
        const submissionData: Partial<BeatCollection> = {
            ...editedSet,
            // Only include id if we're editing an existing set
            ...(isCreating ? {} : { id: editedSet.id }),
        };

        onSave(submissionData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h1 className="text-2xl font-bold mb-4">
                    {isCreating ? "Create New Set" : "Edit Set"}
                </h1>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Set Name Field */}
                    <div>
                        <label htmlFor="set_name" className="block text-sm font-medium text-gray-300">
                            Set Name*
                        </label>
                        <input
                            type="text"
                            name="set_name"
                            id="set_name"
                            value={editedSet.set_name}
                            onChange={handleChange}
                            className={`mt-1 block w-full p-2 bg-gray-700 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                                errors.set_name ? 'border-red-500' : 'border-gray-600'
                            }`}
                            required
                        />
                        {errors.set_name && <p className="text-red-500 text-sm mt-1">{errors.set_name}</p>}
                    </div>

                    {/* Venue Field */}
                    <div>
                        <label htmlFor="venue" className="block text-sm font-medium text-gray-300">
                            Venue
                        </label>
                        <input
                            type="text"
                            name="venue"
                            id="venue"
                            value={editedSet.venue}
                            onChange={handleChange}
                            className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Location Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-300">
                                City
                            </label>
                            <input
                                type="text"
                                name="city"
                                id="city"
                                value={editedSet.city}
                                onChange={handleChange}
                                className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="state_name" className="block text-sm font-medium text-gray-300">
                                State
                            </label>
                            <input
                                type="text"
                                name="state_name"
                                id="state_name"
                                value={editedSet.state_name}
                                onChange={handleChange}
                                className="mt-1 block w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Date Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date_played" className="block text-sm font-medium text-gray-300">
                                Date Played
                            </label>
                            <input
                                type="date"
                                name="date_played"
                                id="date_played"
                                value={editedSet.date_played}
                                onChange={handleChange}
                                className={`mt-1 block w-full p-2 bg-gray-700 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.date_played ? 'border-red-500' : 'border-gray-600'
                                }`}
                            />
                            {errors.date_played && <p className="text-red-500 text-sm mt-1">{errors.date_played}</p>}
                        </div>
                        <div>
                            <label htmlFor="date_created" className="block text-sm font-medium text-gray-300">
                                Date Created
                            </label>
                            <input
                                type="date"
                                name="date_created"
                                id="date_created"
                                value={editedSet.date_created}
                                onChange={handleChange}
                                className={`mt-1 block w-full p-2 bg-gray-700 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                                    errors.date_created ? 'border-red-500' : 'border-gray-600'
                                }`}
                            />
                            {errors.date_created && <p className="text-red-500 text-sm mt-1">{errors.date_created}</p>}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-4">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-sm"
                        >
                            {isCreating ? "Create" : "Save"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md shadow-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSetCard;
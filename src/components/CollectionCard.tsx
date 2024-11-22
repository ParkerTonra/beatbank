import { forwardRef, RefObject, useState } from "react";
import type { BeatCollection } from "../bindings";
import { Tooltip } from "primereact/tooltip";
import { Button } from "primereact/button";

interface CollectionCardProps {
    set?: SetFormState;
    onCloseCollection: () => void;
    onSaveCollection: (setData: Partial<BeatCollection>) => void;
    isCreating?: boolean;
    ref?: RefObject<HTMLInputElement>;
}

interface SetFormState {
    id?: number;
    set_name?: string;
    venue?: string;
    city?: string;
    state_name?: string;
    date_played?: string;
}

interface FormErrors {
    set_name?: string;
    date_played?: string;
    date_created?: string;
}

const CollectionCard = forwardRef<HTMLInputElement, Omit<CollectionCardProps, 'ref'>>((props, ref) => {
    const { set, onCloseCollection, onSaveCollection, isCreating = false } = props;

    const [editedSet, setEditedSet] = useState<SetFormState>({
        id: set?.id,
        set_name: set?.set_name || "",
        venue: set?.venue || "",
        city: set?.city || "",
        state_name: set?.state_name || "",
        date_played: set?.date_played || "",
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const prepareSubmissionData = () => {
        // Ensure we only send YYYY-MM-DD format
        const formattedDate = editedSet.date_played ?
            editedSet.date_played.split('T')[0].split(' ')[0] // This ensures we only get YYYY-MM-DD
            : null;

        const submissionData: Partial<BeatCollection> = {
            id: isCreating ? undefined : editedSet.id,
            set_name: editedSet.set_name || undefined,
            venue: editedSet.venue || undefined,
            city: editedSet.city || undefined,
            state_name: editedSet.state_name || undefined,
            date_played: formattedDate || undefined,
        };
        return submissionData;
    };

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

    const hasChanges = (): boolean => {
        const originalSet = {
            set_name: set?.set_name || "",
            venue: set?.venue || "",
            city: set?.city || "",
            state_name: set?.state_name || "",
            date_played: set?.date_played || "",
        };

        const currentSet = {
            set_name: editedSet.set_name,
            venue: editedSet.venue,
            city: editedSet.city,
            state_name: editedSet.state_name,
            date_played: editedSet.date_played,
        };

        return JSON.stringify(originalSet) !== JSON.stringify(currentSet);
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields before submission
        const newErrors: FormErrors = {};
        if (!editedSet.set_name?.trim()) {
            newErrors.set_name = 'Set name is required';
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        onSaveCollection(prepareSubmissionData());
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
                            className={`mt-1 block w-full p-2 bg-gray-700 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.set_name ? 'border-red-500' : 'border-gray-600'
                                }`}
                            required
                            ref={ref}
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
                                className={`mt-1 block w-full p-2 bg-gray-700 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.date_played ? 'border-red-500' : 'border-gray-600'
                                    }`}
                            />
                            {errors.date_played && <p className="text-red-500 text-sm mt-1">{errors.date_played}</p>}
                        </div>
                        <div>
                            {errors.date_created && <p className="text-red-500 text-sm mt-1">{errors.date_created}</p>}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-4">
                        <div
                            data-pr-tooltip={!hasChanges() && !isCreating ? "Make changes to enable saving" : ""}
                            data-pr-position="top"
                            className="relative"
                        >
                            < Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-sm"
                                data-pr-tooltip={!hasChanges() ? "No changes made" : "Save"}
                                data-pr-position="top"
                                disabled={!hasChanges() && !isCreating}

                            >
                                {isCreating ? "Create" : "Save"}
                            </Button>
                        </div>

                        {!hasChanges() && !isCreating && (
                            <div className="absolute bottom-10 left-0 bg-gray-800 text-white text-xs rounded-md py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                Make changes to enable the button
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onCloseCollection}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md shadow-sm"
                        >
                            Cancel
                        </button>
                        <Tooltip target="div" />
                    </div>
                </form>
            </div>

        </div>

    );
});

export default CollectionCard;